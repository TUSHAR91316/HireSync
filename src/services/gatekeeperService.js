/**
 * HireSync Upstream Eligibility Gatekeeper & Skill-Based Unlock Service
 *
 * Responsibilities:
 * 1. Evaluates candidate profiles against recruiter-configured hard filters (experience, batch, degrees, notice period).
 * 2. Implements the 15% experience buffer zone calculation enabling the Skill Unlock Challenge.
 * 3. Issues cryptographically signed, timed proctored test tokens (15-minute challenge).
 * 4. Integrates with aiIntegrityService to inspect code/text submissions for AI generation & proctor breaches.
 * 5. Grades test submissions and manages unlock records in the database.
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const pool = require('../db/pool');
const { analyzeSubmissionIntegrity } = require('./aiIntegrityService');

/**
 * Normalizes degree strings for resilient comparison.
 * e.g. "B.Tech Computer Science & Engineering" -> "computer science"
 */
function normalizeDegree(degree) {
  if (!degree || typeof degree !== 'string') return '';
  return degree
    .toLowerCase()
    .replace(/[.\-_&/()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if candidate degree matches any allowed degree strings.
 *
 * @param {string} candidateDegree
 * @param {string[]} allowedDegrees
 * @returns {boolean}
 */
function checkDegreeMatch(candidateDegree, allowedDegrees) {
  if (!allowedDegrees || allowedDegrees.length === 0) return true; // No restriction
  if (!candidateDegree) return false;

  const normalizedCandidate = normalizeDegree(candidateDegree);

  return allowedDegrees.some((allowed) => {
    const normalizedAllowed = normalizeDegree(allowed);
    return (
      normalizedCandidate.includes(normalizedAllowed) ||
      normalizedAllowed.includes(normalizedCandidate)
    );
  });
}

/**
 * Evaluates candidate profile eligibility for a given job.
 *
 * @param {object} profile - Candidate profile record
 * @param {object} job - Job posting record with eligibility requirements
 * @param {object} [unlockRecord=null] - Candidate's skill_unlocks record for this job, if any
 * @returns {object} Eligibility evaluation verdict and detailed checklist
 */
function evaluateEligibility(profile, job, unlockRecord = null) {
  const reasons = [];
  const bufferPercentage = config.gatekeeper.skillUnlockBufferPercentage; // 0.15 (15%)

  // Handle prior disqualification from cheating or AI detection
  if (unlockRecord && unlockRecord.disqualified) {
    return {
      status: 'DISQUALIFIED',
      eligible: false,
      skillUnlockAvailable: false,
      unlockedViaTest: false,
      disqualified: true,
      disqualificationReason:
        unlockRecord.disqualification_reason || 'Proctoring or AI Integrity violation detected',
      reasons: [
        `Candidate was disqualified on skill test: ${unlockRecord.disqualification_reason}`,
      ],
      criteriaChecklist: null,
    };
  }

  // Handle prior successful skill unlock
  if (unlockRecord && unlockRecord.passed && !unlockRecord.disqualified) {
    return {
      status: 'ELIGIBLE',
      eligible: true,
      skillUnlockAvailable: false,
      unlockedViaTest: true,
      disqualified: false,
      disqualificationReason: null,
      reasons: [],
      criteriaChecklist: null,
    };
  }

  // 1. Experience Check & Buffer Calculation
  const minExp = parseFloat(job.min_experience) || 0;
  const candExp = parseFloat(profile ? profile.years_experience : 0) || 0;
  const bufferThreshold = parseFloat((minExp * (1 - bufferPercentage)).toFixed(2));

  let expPassed = candExp >= minExp;
  let inBufferZone = !expPassed && candExp >= bufferThreshold;

  if (!expPassed && !inBufferZone) {
    reasons.push(
      `Experience requirement not met: ${candExp} yrs (requires minimum ${minExp} yrs; buffer threshold is ${bufferThreshold} yrs)`
    );
  }

  // 2. Allowed Graduation Batch Years Check
  let batchPassed = true;
  if (job.allowed_batch_years && job.allowed_batch_years.length > 0) {
    const candBatch = profile ? parseInt(profile.batch_year, 10) : null;
    batchPassed = Boolean(candBatch && job.allowed_batch_years.includes(candBatch));
    if (!batchPassed) {
      reasons.push(
        `Graduation batch ${candBatch || 'unspecified'} is outside allowed batches: [${job.allowed_batch_years.join(', ')}]`
      );
    }
  }

  // 3. Allowed Degree Streams Check
  let degreePassed = true;
  if (job.allowed_degrees && job.allowed_degrees.length > 0) {
    const candDegree = profile ? profile.degree_stream : null;
    degreePassed = checkDegreeMatch(candDegree, job.allowed_degrees);
    if (!degreePassed) {
      reasons.push(
        `Degree stream "${candDegree || 'unspecified'}" not in approved list: [${job.allowed_degrees.join(', ')}]`
      );
    }
  }

  // 4. Maximum Notice Period Check
  let noticePassed = true;
  if (job.max_notice_period_days != null && job.max_notice_period_days > 0) {
    const candNotice = profile ? parseInt(profile.notice_period_days, 10) : 0;
    noticePassed = candNotice <= job.max_notice_period_days;
    if (!noticePassed) {
      reasons.push(
        `Notice period of ${candNotice} days exceeds job maximum of ${job.max_notice_period_days} days`
      );
    }
  }

  const checklist = {
    experience: {
      passed: expPassed,
      candidate: candExp,
      required: minExp,
      inBuffer: inBufferZone,
      bufferThreshold,
    },
    batchYear: {
      passed: batchPassed,
      candidate: profile ? profile.batch_year : null,
      allowed: job.allowed_batch_years || [],
    },
    degree: {
      passed: degreePassed,
      candidate: profile ? profile.degree_stream : null,
      allowed: job.allowed_degrees || [],
    },
    noticePeriod: {
      passed: noticePassed,
      candidate: profile ? profile.notice_period_days : 0,
      maxAllowed: job.max_notice_period_days || null,
    },
  };

  // Evaluation outcome determination
  const nonExpCriteriaPassed = batchPassed && degreePassed && noticePassed;

  if (expPassed && nonExpCriteriaPassed) {
    return {
      status: 'ELIGIBLE',
      eligible: true,
      skillUnlockAvailable: false,
      unlockedViaTest: false,
      disqualified: false,
      disqualificationReason: null,
      reasons: [],
      criteriaChecklist: checklist,
    };
  }

  // If experience is in the buffer zone and all other hard criteria passed:
  if (inBufferZone && nonExpCriteriaPassed) {
    return {
      status: 'SKILL_UNLOCK_AVAILABLE',
      eligible: false,
      skillUnlockAvailable: true,
      unlockedViaTest: false,
      disqualified: false,
      disqualificationReason: null,
      reasons: [
        `Candidate experience (${candExp} yrs) is within 15% buffer of requirement (${minExp} yrs). Eligible for 15-min Skill Unlock Assessment.`,
      ],
      criteriaChecklist: checklist,
    };
  }

  return {
    status: 'INELIGIBLE',
    eligible: false,
    skillUnlockAvailable: false,
    unlockedViaTest: false,
    disqualified: false,
    disqualificationReason: null,
    reasons,
    criteriaChecklist: checklist,
  };
}

// Master question pool for dynamically composed 15-minute challenges
const TECHNICAL_CHALLENGE_BANK = [
  {
    id: 'q1',
    skill: 'javascript',
    type: 'multiple-choice',
    question:
      'In Node.js event-driven architecture, in what order does the Event Loop process phases?',
    options: [
      'Timers -> Pending Callbacks -> Poll -> Check (setImmediate) -> Close Callbacks',
      'Poll -> Timers -> Check -> Pending Callbacks -> Close Callbacks',
      'Microtasks -> Timers -> Poll -> Pending Callbacks -> Close Callbacks',
      'Timers -> Poll -> Pending Callbacks -> Close Callbacks -> Check',
    ],
    correctAnswerIndex: 0,
  },
  {
    id: 'q2',
    skill: 'sql',
    type: 'multiple-choice',
    question:
      'Which PostgreSQL index structure is optimized for multi-dimensional array overlap and full-text search queries?',
    options: ['B-Tree Index', 'GIN (Generalized Inverted Index)', 'BRIN Index', 'Hash Index'],
    correctAnswerIndex: 1,
  },
  {
    id: 'q3',
    skill: 'distributed-systems',
    type: 'multiple-choice',
    question:
      'What is the primary guarantee provided by the BullMQ / Redis delayed queue pattern in high-concurrency architectures?',
    options: [
      'Infinite scalability without memory usage',
      'Guaranteed atomic state transitions using Redis Lua scripts without polling overhead',
      'Direct HTTP communication bypassing sockets',
      'Automatic failover to relational storage on network partitions',
    ],
    correctAnswerIndex: 1,
  },
  {
    id: 'q4',
    skill: 'system-design',
    type: 'multiple-choice',
    question:
      'When implementing idempotent POST APIs in payment or recruitment processing, what is the best practice?',
    options: [
      'Ignore duplicate requests and return 200 OK without processing',
      'Require an Idempotency-Key header stored with transaction status in cache/DB',
      'Convert all POST endpoints to GET endpoints',
      'Increase client timeout to 60 seconds',
    ],
    correctAnswerIndex: 1,
  },
  {
    id: 'q5',
    skill: 'algorithms',
    type: 'coding-explanation',
    question:
      'Briefly describe your algorithmic approach to detect circular references or duplicate entries in a directed graph within O(V+E) time, and provide 3-5 lines of core logic in your preferred language.',
    expectedKeywords: [
      'visited',
      'recursion',
      'stack',
      'set',
      'dfs',
      'cycle',
      'indegree',
      'topological',
    ],
  },
];

/**
 * Generates a proctored 15-minute challenge payload and cryptographic session token.
 *
 * @param {string} candidateId
 * @param {object} job
 * @returns {object} Challenge payload with signed session token
 */
function generateSkillUnlockChallenge(candidateId, job) {
  const startedAt = Date.now();
  const durationMinutes = config.gatekeeper.skillUnlockTestDurationMinutes || 15;

  // Sign a tamper-proof session token with candidate, job, and timestamp
  const testToken = jwt.sign(
    {
      candidateId,
      jobId: job.id,
      startedAt,
      durationMinutes,
      type: 'SKILL_UNLOCK_SESSION',
    },
    config.jwt.secret,
    { expiresIn: `${durationMinutes + 5}m` }
  );

  // Strip answer keys before returning to candidate client
  const sanitizedQuestions = TECHNICAL_CHALLENGE_BANK.map((q) => {
    if (q.type === 'multiple-choice') {
      return {
        id: q.id,
        skill: q.skill,
        type: q.type,
        question: q.question,
        options: q.options,
      };
    }
    return {
      id: q.id,
      skill: q.skill,
      type: q.type,
      question: q.question,
    };
  });

  return {
    testToken,
    durationMinutes,
    maxTabSwitchesAllowed: config.antiCheating.maxTabSwitchesAllowed,
    job: {
      id: job.id,
      title: job.title,
    },
    questions: sanitizedQuestions,
  };
}

/**
 * Validates test submission, performs AI detection scan & proctor checks,
 * grades technical answers, and records results in DB.
 *
 * @param {object} params
 * @param {string} params.candidateId
 * @param {string} params.jobId
 * @param {string} params.testToken
 * @param {object} params.answers - Key-value map of question id to answer
 * @param {string} [params.codeSnippet=''] - Code submitted for written problem
 * @param {string} [params.explanationText=''] - Explanation submitted
 * @param {number} [params.tabSwitchCount=0] - Monitored window blurs/switches
 * @param {boolean} [params.wasPasted=false] - Telemetry indicator of block paste
 * @param {number} [params.typingDurationSeconds=0]
 * @returns {Promise<object>} Grading result with pass/fail and integrity flags
 */
async function gradeSkillUnlockSubmission({
  candidateId,
  jobId,
  testToken,
  answers = {},
  codeSnippet = '',
  explanationText = '',
  tabSwitchCount = 0,
  wasPasted = false,
  typingDurationSeconds = 0,
}) {
  // 1. Validate session token
  let decoded;
  try {
    decoded = jwt.verify(testToken, config.jwt.secret);
  } catch (err) {
    const error = new Error('Invalid or expired skill unlock test token');
    error.status = 401;
    throw error;
  }

  if (decoded.candidateId !== candidateId || decoded.jobId !== jobId) {
    const error = new Error('Test token does not match candidate or job context');
    error.status = 403;
    throw error;
  }

  // 2. Server-side Timing Verification
  const now = Date.now();
  const elapsedSeconds = (now - decoded.startedAt) / 1000;
  const maxAllowedSeconds =
    (decoded.durationMinutes || 15) * 60 + config.antiCheating.testGracePeriodSeconds;

  if (elapsedSeconds > maxAllowedSeconds) {
    const error = new Error(
      `Test submission expired. Time taken: ${Math.round(elapsedSeconds)}s (limit: ${maxAllowedSeconds}s)`
    );
    error.status = 400;
    throw error;
  }

  // 3. Proctoring / Anti-Cheat Tab Switch Enforcement
  let disqualified = false;
  let disqualificationReason = null;

  if (tabSwitchCount > config.antiCheating.maxTabSwitchesAllowed) {
    disqualified = true;
    disqualificationReason = `Proctoring violation: ${tabSwitchCount} tab switch(es) detected (max allowed: ${config.antiCheating.maxTabSwitchesAllowed})`;
  }

  // 4. AI Content & Plagiarism Detection Scan
  const aiIntegrity = analyzeSubmissionIntegrity({
    codeSnippet,
    explanationText,
    wasPasted,
    typingDurationSeconds,
  });

  if (!disqualified && aiIntegrity.verdict === 'DISQUALIFIED') {
    disqualified = true;
    disqualificationReason = aiIntegrity.disqualificationReason;
  }

  // 5. Grade Technical Accuracy
  let pointsEarned = 0;
  const totalQuestions = TECHNICAL_CHALLENGE_BANK.length;

  for (const q of TECHNICAL_CHALLENGE_BANK) {
    if (q.type === 'multiple-choice') {
      const candidateAnswer = answers[q.id];
      if (candidateAnswer !== undefined && parseInt(candidateAnswer, 10) === q.correctAnswerIndex) {
        pointsEarned += 1;
      }
    } else if (q.type === 'coding-explanation') {
      const combined = `${explanationText} ${codeSnippet}`.toLowerCase();
      let matchedKeywords = 0;
      for (const kw of q.expectedKeywords) {
        if (combined.includes(kw)) matchedKeywords++;
      }
      // Award point if at least 2 relevant algorithmic concepts are present
      if (matchedKeywords >= 2) {
        pointsEarned += 1;
      }
    }
  }

  const scorePercentage = parseFloat(((pointsEarned / totalQuestions) * 100).toFixed(2));
  const passingScore = config.gatekeeper.passingScorePercentage || 70.0;
  const passed = !disqualified && scorePercentage >= passingScore;

  // 6. Record or update skill_unlocks in database
  const startedAtIso = new Date(decoded.startedAt).toISOString();
  const completedAtIso = new Date(now).toISOString();

  try {
    await pool.query(
      `INSERT INTO skill_unlocks (
        candidate_id, job_id, score, passed, tab_switch_count,
        ai_confidence, disqualified, disqualification_reason, started_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (candidate_id, job_id) DO UPDATE SET
        score = EXCLUDED.score,
        passed = EXCLUDED.passed,
        tab_switch_count = EXCLUDED.tab_switch_count,
        ai_confidence = EXCLUDED.ai_confidence,
        disqualified = EXCLUDED.disqualified,
        disqualification_reason = EXCLUDED.disqualification_reason,
        completed_at = EXCLUDED.completed_at`,
      [
        candidateId,
        jobId,
        scorePercentage,
        passed,
        tabSwitchCount,
        aiIntegrity.aiConfidence,
        disqualified,
        disqualificationReason,
        startedAtIso,
        completedAtIso,
      ]
    );
  } catch (dbErr) {
    // If running in DB-offline test environment, log warning but continue
    console.warn('[GATEKEEPER] DB persist notice:', dbErr.message);
  }

  return {
    score: scorePercentage,
    passed,
    passingScore,
    disqualified,
    disqualificationReason,
    aiConfidence: aiIntegrity.aiConfidence,
    aiVerdict: aiIntegrity.verdict,
    flags: aiIntegrity.flags,
    timeTakenSeconds: Math.round(elapsedSeconds),
  };
}

module.exports = {
  evaluateEligibility,
  checkDegreeMatch,
  normalizeDegree,
  generateSkillUnlockChallenge,
  gradeSkillUnlockSubmission,
  TECHNICAL_CHALLENGE_BANK,
};
