/**
 * HireSync In-App Assessment Engine Service (`src/services/assessmentService.js`)
 *
 * Implements:
 * 1. Rich Engineering Question Bank & Category Taxonomy.
 * 2. Dynamic Assessment Generation tailored to Job Requisitions.
 * 3. Secure Session Token Signing & Anti-Tamper Verification.
 * 4. Candidate Question Sanitization (Strictly redacts answer keys & explanations).
 * 5. Deterministic Auto-Grading with Competency / Category Mastery breakdown.
 * 6. Workday / LinkedIn standard applicant scorecard reporting.
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../db/pool');

// ─────────────────────────────────────────────────────────────
// 1. QUESTION BANK & CATEGORY TAXONOMY
// ─────────────────────────────────────────────────────────────

const QUESTION_BANK = [
  // CATEGORY: Core CS & Algorithms
  {
    id: 'q-algo-01',
    category: 'Core CS & Algorithms',
    type: 'multiple-choice',
    question:
      'What is the worst-case time complexity of searching an element in a balanced Red-Black tree vs an unindexed linked list?',
    options: [
      'O(log n) for Red-Black Tree vs O(n) for Linked List',
      'O(1) for Red-Black Tree vs O(log n) for Linked List',
      'O(n) for Red-Black Tree vs O(1) for Linked List',
      'O(n log n) for Red-Black Tree vs O(n^2) for Linked List',
    ],
    correctIndex: 0,
    explanation:
      'Red-Black trees maintain logarithmic depth balance guaranteeing O(log n) worst-case search, insertion, and deletion. An unindexed singly linked list requires linear traversal O(n).',
    weight: 10,
  },
  {
    id: 'q-algo-02',
    category: 'Core CS & Algorithms',
    type: 'code-analysis',
    question:
      'Analyze the following recursion snippet. What is its time and auxiliary space complexity?',
    codeSnippet: `function fib(n, memo = {}) {
  if (n <= 1) return n;
  if (n in memo) return memo[n];
  memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
  return memo[n];
}`,
    options: [
      'Time: O(2^n), Space: O(n)',
      'Time: O(n), Space: O(n) auxiliary call stack & memo hash table',
      'Time: O(n log n), Space: O(1)',
      'Time: O(1), Space: O(n^2)',
    ],
    correctIndex: 1,
    explanation:
      'Memoization reduces exponential 2^n overlapping subproblems to n unique computations evaluated once in O(1) time each, yielding linear O(n) time and O(n) space.',
    weight: 10,
  },

  // CATEGORY: System Architecture & Scalability
  {
    id: 'q-sys-01',
    category: 'System Architecture & Scalability',
    type: 'multiple-choice',
    question:
      'In high-throughput distributed architectures, how is the "Thundering Herd" cache stampede problem effectively mitigated?',
    options: [
      'Increasing the HTTP timeout on downstream clients to 120 seconds',
      'Using probabilistic early expiration (XFetch algorithm) or distributed mutex locking on cache misses',
      'Bypassing the cache layer entirely and allowing all traffic to hit primary read replicas',
      'Replacing Redis with local memory arrays on each web worker instance',
    ],
    correctIndex: 1,
    explanation:
      'A cache stampede occurs when high concurrency causes multiple threads to simultaneously miss a key and overwhelm the database. Using distributed locks (mutex) or probabilistic early refreshing (XFetch) ensures only one process recomputes the cache value.',
    weight: 10,
  },
  {
    id: 'q-sys-02',
    category: 'System Architecture & Scalability',
    type: 'multiple-choice',
    question:
      'What design pattern guarantees exactly-once processing semantics when consuming webhook events from third-party payment gateways?',
    options: [
      'Client-side retry without server tracking',
      'Idempotency-Key logging in an atomic persistent store with deduplication check before side-effects',
      'Switching all webhook listeners from HTTPS to raw UDP',
      'Dropping any request that takes longer than 200ms to parse',
    ],
    correctIndex: 1,
    explanation:
      'Distributed systems achieve effective exactly-once semantics by combining at-least-once delivery with an idempotent receiver storing a unique transaction or idempotency key in an atomic datastore.',
    weight: 10,
  },

  // CATEGORY: Database Engineering & SQL
  {
    id: 'q-db-01',
    category: 'Database Engineering & SQL',
    type: 'multiple-choice',
    question:
      'Which PostgreSQL index type is most optimal for querying JSONB documents with containment operators (@>) and full-text search vectors?',
    options: [
      'B-Tree Index',
      'GIN (Generalized Inverted Index)',
      'BRIN (Block Range Index)',
      'Hash Index',
    ],
    correctIndex: 1,
    explanation:
      'GIN indexes map elements (keys/values in JSONB or lexemes in tsvector) to the rows containing them, making them ideal for multi-value search and the @> containment operator.',
    weight: 10,
  },
  {
    id: 'q-db-02',
    category: 'Database Engineering & SQL',
    type: 'code-analysis',
    question:
      'Consider the following transaction executing under PostgreSQL default Read Committed isolation level. What anomaly can occur?',
    codeSnippet: `BEGIN TRANSACTION;
-- Query 1
SELECT balance FROM accounts WHERE user_id = 'user-123';
-- (Concurrent transaction updates and commits user-123 balance)
-- Query 2
SELECT balance FROM accounts WHERE user_id = 'user-123';
COMMIT;`,
    options: [
      'Dirty Read',
      'Non-Repeatable Read (balance may differ between Query 1 and Query 2)',
      'Deadlock automatically raised on Query 1',
      'Phantom Row Deletion error',
    ],
    correctIndex: 1,
    explanation:
      'In Read Committed isolation, each SELECT sees data committed before the query begins. If another transaction commits an UPDATE between Query 1 and Query 2, Query 2 will see the new balance (Non-Repeatable Read). Serializable or Repeatable Read prevents this.',
    weight: 10,
  },

  // CATEGORY: Modern Full-Stack & APIs
  {
    id: 'q-fullstack-01',
    category: 'Modern Full-Stack & APIs',
    type: 'code-analysis',
    question:
      'In Node.js, what is the exact execution output order of the following asynchronous code?',
    codeSnippet: `console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
process.nextTick(() => console.log('4'));
console.log('5');`,
    options: [
      '1 -> 5 -> 4 -> 3 -> 2',
      '1 -> 2 -> 3 -> 4 -> 5',
      '1 -> 5 -> 2 -> 3 -> 4',
      '1 -> 4 -> 3 -> 5 -> 2',
    ],
    correctIndex: 0,
    explanation:
      'Synchronous code runs first (1, 5). Next, microtask queues drain: process.nextTick takes priority over standard microtasks (4), then Promise microtasks resolve (3). Finally, the macrotask timer callback executes (2).',
    weight: 10,
  },
  {
    id: 'q-fullstack-02',
    category: 'Modern Full-Stack & APIs',
    type: 'multiple-choice',
    question:
      'In React 18 Concurrent Mode, which hook should be used to defer rendering a non-urgent UI list without freezing the urgent search input text box?',
    options: [
      'useEffect() with empty dependency array',
      'useDeferredValue() or useTransition()',
      'useLayoutEffect() with synchronous DOM mutation',
      'useCallback() wrapping the event handler',
    ],
    correctIndex: 1,
    explanation:
      'useDeferredValue and useTransition allow React to yield execution back to urgent user input interactions (e.g. typing) while rendering non-urgent heavy tree updates in the background.',
    weight: 10,
  },

  // CATEGORY: Reliability & Security
  {
    id: 'q-sec-01',
    category: 'Reliability & Security',
    type: 'multiple-choice',
    question:
      'To defend against Cross-Site Scripting (XSS) and token exfiltration, where should authentication JWTs ideally be stored in browser environments?',
    options: [
      'window.localStorage with public JS accessibility',
      'HttpOnly, Secure, SameSite=Strict cookies inaccessible to client-side document.cookie',
      'document.location.hash parameter',
      'IndexedDB in plaintext without encryption',
    ],
    correctIndex: 1,
    explanation:
      'HttpOnly cookies cannot be read or stolen via client-side JavaScript execution (mitigating XSS theft). Combined with Secure (HTTPS only) and SameSite=Strict/Lax, they provide robust CSRF and XSS defense.',
    weight: 10,
  },
  {
    id: 'q-sec-02',
    category: 'Reliability & Security',
    type: 'multiple-choice',
    question:
      'When implementing rate limiting on critical recruitment endpoints (e.g. resume uploads and submissions), what algorithmic strategy provides optimal memory efficiency and smooth burst tolerance?',
    options: [
      'Fixed Window Counter with sudden boundary spikes',
      'Token Bucket or Leaky Bucket with Redis sliding window logs',
      'Storing all incoming IP addresses indefinitely in an unindexed SQL table',
      'Disabling keep-alive on the reverse proxy',
    ],
    correctIndex: 1,
    explanation:
      'Token Bucket / Leaky Bucket algorithms permit defined bursts while enforcing a steady average throughput rate without the edge-spike vulnerability inherent in naive Fixed Window counters.',
    weight: 10,
  },
];

// ─────────────────────────────────────────────────────────────
// 2. ASSESSMENT GENERATOR & SANITIZER
// ─────────────────────────────────────────────────────────────

/**
 * Returns a balanced assessment question set for a job posting.
 * If the recruiter customized questions in the database, returns those.
 * Otherwise returns the standard enterprise question bank.
 */
function getDefaultAssessmentQuestions() {
  return QUESTION_BANK;
}

/**
 * Sanitizes an assessment question set for candidate delivery.
 * CRITICAL SECURITY INVARIANT: Strips correctIndex and explanation!
 */
function sanitizeAssessmentQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => ({
    id: q.id,
    category: q.category || 'General Technical',
    type: q.type || 'multiple-choice',
    question: q.question,
    codeSnippet: q.codeSnippet || null,
    options: q.options || [],
    weight: q.weight || 10,
  }));
}

/**
 * Signs a tamper-proof JWT assessment session token.
 */
function signAssessmentToken({ applicationId, candidateId, jobId, durationMinutes }) {
  const duration = durationMinutes || config.assessment.defaultDurationMinutes;
  const gracePeriod = config.antiCheating.testGracePeriodSeconds;
  const expirySeconds = duration * 60 + gracePeriod;

  return jwt.sign(
    {
      applicationId,
      candidateId,
      jobId,
      durationMinutes: duration,
      startedAt: Math.floor(Date.now() / 1000),
    },
    config.jwt.secret,
    { expiresIn: expirySeconds }
  );
}

/**
 * Verifies a candidate assessment session token.
 */
function verifyAssessmentToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const error = new Error('ASSESSMENT_TIME_EXPIRED');
      error.code = 'ASSESSMENT_TIME_EXPIRED';
      throw error;
    }
    const error = new Error('INVALID_ASSESSMENT_TOKEN');
    error.code = 'INVALID_ASSESSMENT_TOKEN';
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// 3. DETERMINISTIC AUTO-GRADING & SCORECARD GENERATOR
// ─────────────────────────────────────────────────────────────

/**
 * Grades a candidate's submitted answers against the assessment answer key.
 *
 * @param {Object} params
 * @param {Array} params.questions - Full questions array with correctIndex and explanation
 * @param {Object} params.answers - Object mapping questionId to selected option index (0..3)
 * @param {number} params.durationTakenSeconds - Time candidate took to complete
 * @param {number} params.tabSwitchCount - Telemetry count of tab leaves
 * @param {number} params.aiConfidence - AI similarity match ratio (0.00 to 1.00)
 * @param {number} params.passingScore - Passing threshold percentage (e.g. 75.0)
 * @returns {Object} Scorecard with overall score, category breakdown, question audit
 */
function gradeAssessmentSubmission({
  questions,
  answers = {},
  durationTakenSeconds = 0,
  tabSwitchCount = 0,
  aiConfidence = 0.0,
  passingScore = config.assessment.defaultPassingScore,
}) {
  const testQuestions =
    Array.isArray(questions) && questions.length > 0 ? questions : QUESTION_BANK;

  let totalPossiblePoints = 0;
  let earnedPoints = 0;
  const categoryMap = {};
  const questionResults = [];

  for (const q of testQuestions) {
    const weight = typeof q.weight === 'number' ? q.weight : 10;
    totalPossiblePoints += weight;

    // Initialize category accumulator
    const cat = q.category || 'General';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { earned: 0, total: 0, correctCount: 0, totalCount: 0 };
    }
    categoryMap[cat].total += weight;
    categoryMap[cat].totalCount += 1;

    // Evaluate submitted answer
    const userAnswerIndex = answers[q.id];
    const isAnswered = userAnswerIndex !== undefined && userAnswerIndex !== null;
    const isCorrect = isAnswered && parseInt(userAnswerIndex, 10) === q.correctIndex;

    const pointsEarned = isCorrect ? weight : 0;
    earnedPoints += pointsEarned;

    if (isCorrect) {
      categoryMap[cat].earned += weight;
      categoryMap[cat].correctCount += 1;
    }

    // Workday-grade question-by-question audit payload
    questionResults.push({
      questionId: q.id,
      category: cat,
      question: q.question,
      codeSnippet: q.codeSnippet || null,
      options: q.options || [],
      candidateAnswerIndex: isAnswered ? parseInt(userAnswerIndex, 10) : null,
      candidateAnswerText:
        isAnswered && q.options && q.options[userAnswerIndex] !== undefined
          ? q.options[userAnswerIndex]
          : 'Skipped / Unanswered',
      correctAnswerIndex: q.correctIndex,
      correctAnswerText: q.options && q.options[q.correctIndex] ? q.options[q.correctIndex] : '',
      isCorrect,
      pointsEarned,
      pointsPossible: weight,
      explanation: q.explanation || 'Verified technical standard.',
    });
  }

  // Calculate percentage scores
  const rawPercentage = totalPossiblePoints > 0 ? (earnedPoints / totalPossiblePoints) * 100 : 0;
  const overallScore = Math.round(rawPercentage * 100) / 100;

  // Build category mastery breakdown
  const categoryScores = {};
  for (const [catName, catData] of Object.entries(categoryMap)) {
    const catPct =
      catData.total > 0 ? Math.round((catData.earned / catData.total) * 100 * 10) / 10 : 0;
    categoryScores[catName] = {
      earnedPoints: catData.earned,
      totalPoints: catData.total,
      correctCount: catData.correctCount,
      totalCount: catData.totalCount,
      percentage: catPct,
      rating:
        catPct >= 85
          ? 'EXPERT'
          : catPct >= 70
            ? 'PROFICIENT'
            : catPct >= 50
              ? 'FOUNDATIONAL'
              : 'NEEDS_IMPROVEMENT',
    };
  }

  // Proctoring & Anti-cheating check
  let disqualified = false;
  let disqualificationReason = null;

  if (tabSwitchCount > config.antiCheating.maxTabSwitchesAllowed) {
    disqualified = true;
    disqualificationReason = `Proctoring violation: Candidate exceeded maximum permitted tab switches (${tabSwitchCount} switches > ${config.antiCheating.maxTabSwitchesAllowed} limit).`;
  } else if (aiConfidence > config.antiCheating.aiDetectionThreshold) {
    disqualified = true;
    disqualificationReason = `Integrity flag: AI-generated response similarity detected (${Math.round(
      aiConfidence * 100
    )}% confidence > ${Math.round(config.antiCheating.aiDetectionThreshold * 100)}% threshold).`;
  }

  const passed = !disqualified && overallScore >= passingScore;

  // Calculate comparative percentile rank
  let percentile = 50;
  if (overallScore >= 95) percentile = 98;
  else if (overallScore >= 90) percentile = 94;
  else if (overallScore >= 80) percentile = 82;
  else if (overallScore >= 75) percentile = 74;
  else if (overallScore >= 60) percentile = 56;
  else percentile = Math.max(10, Math.round(overallScore * 0.7));

  return {
    score: overallScore,
    earnedPoints,
    totalPossiblePoints,
    passingScore,
    passed,
    disqualified,
    disqualificationReason,
    percentile,
    durationTakenSeconds,
    tabSwitchCount,
    aiConfidence,
    categoryScores,
    questionResults,
    evaluatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// 4. DATABASE QUERIES & PERSISTENCE
// ─────────────────────────────────────────────────────────────

/**
 * Retrieves the configured assessment for a job.
 * If none exists, creates and persists the default assessment.
 */
async function getOrCreateAssessmentForJob(jobId, jobTitle = 'Technical Assessment') {
  const selectRes = await query(`SELECT * FROM assessments WHERE job_id = $1`, [jobId]);

  if (selectRes.rows.length > 0) {
    return selectRes.rows[0];
  }

  // Insert default assessment for this job
  const defaultQuestions = getDefaultAssessmentQuestions();
  const insertRes = await query(
    `INSERT INTO assessments (
      job_id, title, description, duration_minutes, passing_score, questions
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      jobId,
      `${jobTitle} Skill Assessment`,
      'Enterprise in-app evaluation measuring Core CS, Systems Architecture, Database Engineering, and API Reliability.',
      config.assessment.defaultDurationMinutes,
      config.assessment.defaultPassingScore,
      JSON.stringify(defaultQuestions),
    ]
  );

  return insertRes.rows[0];
}

/**
 * Saves or updates a recruiter's custom assessment for a job.
 */
async function saveCustomAssessment({
  jobId,
  title,
  description,
  durationMinutes,
  passingScore,
  questions,
}) {
  const duration = durationMinutes || config.assessment.defaultDurationMinutes;
  const passScore = passingScore || config.assessment.defaultPassingScore;
  const questionsJson = JSON.stringify(questions || getDefaultAssessmentQuestions());

  const result = await query(
    `INSERT INTO assessments (
      job_id, title, description, duration_minutes, passing_score, questions, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (job_id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      duration_minutes = EXCLUDED.duration_minutes,
      passing_score = EXCLUDED.passing_score,
      questions = EXCLUDED.questions,
      updated_at = NOW()
    RETURNING *`,
    [jobId, title, description, duration, passScore, questionsJson]
  );

  return result.rows[0];
}

/**
 * Persists graded assessment results in test_scores table.
 */
async function recordAssessmentScore({
  applicationId,
  candidateId,
  jobId,
  score,
  passed,
  timeTakenSeconds,
  questionBreakdown,
}) {
  const result = await query(
    `INSERT INTO test_scores (
      application_id, candidate_id, job_id, score, passed, time_taken_seconds, question_breakdown, status, completed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETED', NOW())
    RETURNING *`,
    [
      applicationId,
      candidateId,
      jobId,
      score,
      passed,
      timeTakenSeconds,
      JSON.stringify(questionBreakdown),
    ]
  );

  return result.rows[0];
}

/**
 * Fetches the applicant scorecard and assessment breakdown for HR.
 */
async function getApplicantScorecard(applicationId) {
  const result = await query(
    `SELECT ts.*,
            a.status AS application_status,
            a.match_score,
            a.tier,
            a.applied_at,
            j.id AS job_id,
            j.title AS job_title,
            j.department,
            p.full_name AS candidate_name,
            p.years_experience,
            p.degree_stream,
            u.email AS candidate_email
     FROM test_scores ts
     JOIN applications a ON a.id = ts.application_id
     JOIN jobs j ON j.id = a.job_id
     JOIN users u ON u.id = a.candidate_id
     LEFT JOIN profiles p ON p.user_id = a.candidate_id
     WHERE ts.application_id = $1
     ORDER BY ts.completed_at DESC
     LIMIT 1`,
    [applicationId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  // Parse question_breakdown if stored as string
  if (typeof row.question_breakdown === 'string') {
    try {
      row.question_breakdown = JSON.parse(row.question_breakdown);
    } catch (e) {
      // Keep as-is
    }
  }

  return row;
}

module.exports = {
  QUESTION_BANK,
  getDefaultAssessmentQuestions,
  sanitizeAssessmentQuestions,
  signAssessmentToken,
  verifyAssessmentToken,
  gradeAssessmentSubmission,
  getOrCreateAssessmentForJob,
  saveCustomAssessment,
  recordAssessmentScore,
  getApplicantScorecard,
};
