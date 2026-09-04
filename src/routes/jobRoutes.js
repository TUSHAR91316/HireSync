/**
 * HireSync Job Routes (`src/routes/jobRoutes.js`)
 *
 * Provides:
 * 1. HR Job Management (Create, List, Update, Deactivate with eligibility rules and SLA parameters).
 * 2. Candidate Job Feed with Dynamic Gatekeeper Evaluation Badges.
 * 3. Proctored Timed Skill-Based Unlock Challenge Endpoints with AI Anti-Cheat Scan.
 */

const express = require('express');
const { body } = require('express-validator');
const { query } = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const validateRequest = require('../middleware/validateRequest');
const {
  evaluateEligibility,
  generateSkillUnlockChallenge,
  gradeSkillUnlockSubmission,
} = require('../services/gatekeeperService');

const router = express.Router();

// ─────────────────────────────────────────────
// HR: POST /api/hr/jobs — Create New Job Posting
// ─────────────────────────────────────────────
const jobCreationValidators = [
  body('title').trim().notEmpty().withMessage('Job title is required.'),
  body('min_experience')
    .isFloat({ min: 0, max: 40 })
    .withMessage('Minimum experience must be a non-negative number.'),
  body('allowed_batch_years')
    .optional()
    .isArray()
    .withMessage('allowed_batch_years must be an array of graduation years.'),
  body('allowed_degrees')
    .optional()
    .isArray()
    .withMessage('allowed_degrees must be an array of degree streams.'),
  body('max_notice_period_days')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 365 })
    .withMessage('Maximum notice period must be between 0 and 365 days.'),
  body('sla_days')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('SLA days must be between 1 and 60 days.'),
];

router.post(
  '/hr/jobs',
  authMiddleware,
  roleGuard('RECRUITER'),
  jobCreationValidators,
  validateRequest,
  async (req, res, next) => {
    try {
      const recruiterId = req.user.userId || req.user.id;
      const {
        title,
        description,
        department,
        location,
        workplace_type = 'Remote',
        salary_range,
        min_experience,
        allowed_batch_years = [],
        allowed_degrees = [],
        max_notice_period_days = null,
        required_skills = [],
        sla_days = 7,
      } = req.body;

      const result = await query(
        `INSERT INTO jobs (
          recruiter_id, title, description, department, location, workplace_type,
          salary_range, min_experience, allowed_batch_years, allowed_degrees,
          max_notice_period_days, required_skills, sla_days, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)
        RETURNING *`,
        [
          recruiterId,
          title,
          description || '',
          department || 'Engineering',
          location || 'Remote',
          workplace_type,
          salary_range || 'Competitive',
          min_experience,
          allowed_batch_years,
          allowed_degrees,
          max_notice_period_days,
          required_skills,
          sla_days,
        ]
      );

      return res.status(201).json({
        success: true,
        message: 'Job posting created successfully with eligibility gatekeeper rules.',
        job: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// HR: GET /api/hr/jobs — List Recruiter's Job Postings
// ─────────────────────────────────────────────
router.get('/hr/jobs', authMiddleware, roleGuard('RECRUITER'), async (req, res, next) => {
  try {
    const recruiterId = req.user.userId || req.user.id;

    const result = await query(
      `SELECT j.*,
              COUNT(a.id)::int AS applicant_count
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.recruiter_id = $1
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [recruiterId]
    );

    return res.status(200).json({
      success: true,
      jobs: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// HR: PUT /api/hr/jobs/:id — Update Job Criteria & SLA
// ─────────────────────────────────────────────
router.put('/hr/jobs/:id', authMiddleware, roleGuard('RECRUITER'), async (req, res, next) => {
  try {
    const recruiterId = req.user.userId || req.user.id;
    const jobId = req.params.id;

    const {
      title,
      description,
      department,
      location,
      workplace_type,
      salary_range,
      min_experience,
      allowed_batch_years,
      allowed_degrees,
      max_notice_period_days,
      required_skills,
      sla_days,
      is_active,
    } = req.body;

    const existing = await query(`SELECT * FROM jobs WHERE id = $1 AND recruiter_id = $2`, [
      jobId,
      recruiterId,
    ]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: 'Job posting not found or you do not have permission to edit it.',
      });
    }

    const current = existing.rows[0];

    const updated = await query(
      `UPDATE jobs SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        department = COALESCE($3, department),
        location = COALESCE($4, location),
        workplace_type = COALESCE($5, workplace_type),
        salary_range = COALESCE($6, salary_range),
        min_experience = COALESCE($7, min_experience),
        allowed_batch_years = COALESCE($8, allowed_batch_years),
        allowed_degrees = COALESCE($9, allowed_degrees),
        max_notice_period_days = COALESCE($10, max_notice_period_days),
        required_skills = COALESCE($11, required_skills),
        sla_days = COALESCE($12, sla_days),
        is_active = COALESCE($13, is_active),
        updated_at = NOW()
       WHERE id = $14 AND recruiter_id = $15
       RETURNING *`,
      [
        title,
        description,
        department,
        location,
        workplace_type,
        salary_range,
        min_experience,
        allowed_batch_years,
        allowed_degrees,
        max_notice_period_days,
        required_skills,
        sla_days,
        is_active,
        jobId,
        recruiterId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Job posting criteria updated successfully.',
      job: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// HR: DELETE /api/hr/jobs/:id — Deactivate Job Posting
// ─────────────────────────────────────────────
router.delete('/hr/jobs/:id', authMiddleware, roleGuard('RECRUITER'), async (req, res, next) => {
  try {
    const recruiterId = req.user.userId || req.user.id;
    const jobId = req.params.id;

    const result = await query(
      `UPDATE jobs SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND recruiter_id = $2
       RETURNING id, title, is_active`,
      [jobId, recruiterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'JOB_NOT_FOUND' });
    }

    return res.status(200).json({
      success: true,
      message: 'Job posting deactivated successfully.',
      job: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// CANDIDATE: GET /api/candidate/jobs — Feed with Gatekeeper Badges
// ─────────────────────────────────────────────
router.get('/candidate/jobs', authMiddleware, roleGuard('CANDIDATE'), async (req, res, next) => {
  try {
    const candidateId = req.user.userId || req.user.id;

    // 1. Fetch Candidate Profile
    const profileRes = await query(`SELECT * FROM profiles WHERE user_id = $1`, [candidateId]);
    const candidateProfile = profileRes.rows[0] || null;

    // 2. Fetch Active Jobs
    const jobsRes = await query(
      `SELECT j.*, p.company_name
       FROM jobs j
       LEFT JOIN profiles p ON p.user_id = j.recruiter_id
       WHERE j.is_active = TRUE
       ORDER BY j.created_at DESC`
    );

    // 3. Fetch Candidate Unlocks for All Jobs
    const unlocksRes = await query(`SELECT * FROM skill_unlocks WHERE candidate_id = $1`, [
      candidateId,
    ]);
    const unlockMap = new Map();
    for (const u of unlocksRes.rows) {
      unlockMap.set(u.job_id, u);
    }

    // 4. Fetch Candidate Existing Applications
    const appsRes = await query(`SELECT job_id, status FROM applications WHERE candidate_id = $1`, [
      candidateId,
    ]);
    const appliedMap = new Map();
    for (const a of appsRes.rows) {
      appliedMap.set(a.job_id, a.status);
    }

    // 5. Annotate each job with Gatekeeper Evaluation
    const evaluatedJobs = jobsRes.rows.map((job) => {
      const unlockRecord = unlockMap.get(job.id) || null;
      const evaluation = evaluateEligibility(candidateProfile, job, unlockRecord);
      const appliedStatus = appliedMap.get(job.id) || null;

      return {
        ...job,
        eligibilityStatus: evaluation.status, // 'ELIGIBLE' | 'SKILL_UNLOCK_AVAILABLE' | 'INELIGIBLE' | 'DISQUALIFIED'
        canApply: evaluation.eligible && !appliedStatus,
        hasApplied: Boolean(appliedStatus),
        applicationStatus: appliedStatus,
        reasons: evaluation.reasons,
        unlockedViaTest: evaluation.unlockedViaTest,
        disqualified: evaluation.disqualified,
        disqualificationReason: evaluation.disqualificationReason,
        criteriaChecklist: evaluation.criteriaChecklist,
      };
    });

    return res.status(200).json({
      success: true,
      jobs: evaluatedJobs,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// CANDIDATE: GET /api/candidate/jobs/:id — Job Details & Checklist
// ─────────────────────────────────────────────
router.get(
  '/candidate/jobs/:id',
  authMiddleware,
  roleGuard('CANDIDATE'),
  async (req, res, next) => {
    try {
      const candidateId = req.user.userId || req.user.id;
      const jobId = req.params.id;

      const jobRes = await query(`SELECT * FROM jobs WHERE id = $1`, [jobId]);
      if (jobRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'JOB_NOT_FOUND' });
      }
      const job = jobRes.rows[0];

      const profileRes = await query(`SELECT * FROM profiles WHERE user_id = $1`, [candidateId]);
      const profile = profileRes.rows[0] || null;

      const unlockRes = await query(
        `SELECT * FROM skill_unlocks WHERE candidate_id = $1 AND job_id = $2`,
        [candidateId, jobId]
      );
      const unlockRecord = unlockRes.rows[0] || null;

      const evaluation = evaluateEligibility(profile, job, unlockRecord);

      const appRes = await query(
        `SELECT * FROM applications WHERE candidate_id = $1 AND job_id = $2`,
        [candidateId, jobId]
      );
      const application = appRes.rows[0] || null;

      return res.status(200).json({
        success: true,
        job,
        evaluation,
        hasApplied: Boolean(application),
        application,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// CANDIDATE: GET /api/candidate/jobs/:id/skill-unlock — Start Proctored Challenge
// ─────────────────────────────────────────────
router.get(
  '/candidate/jobs/:id/skill-unlock',
  authMiddleware,
  roleGuard('CANDIDATE'),
  async (req, res, next) => {
    try {
      const candidateId = req.user.userId || req.user.id;
      const jobId = req.params.id;

      const jobRes = await query(`SELECT * FROM jobs WHERE id = $1 AND is_active = TRUE`, [jobId]);
      if (jobRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'JOB_NOT_FOUND' });
      }
      const job = jobRes.rows[0];

      // Check candidate profile
      const profileRes = await query(`SELECT * FROM profiles WHERE user_id = $1`, [candidateId]);
      const profile = profileRes.rows[0] || null;

      // Check unlock record
      const unlockRes = await query(
        `SELECT * FROM skill_unlocks WHERE candidate_id = $1 AND job_id = $2`,
        [candidateId, jobId]
      );
      const unlockRecord = unlockRes.rows[0] || null;

      if (unlockRecord && unlockRecord.disqualified) {
        return res.status(403).json({
          success: false,
          error: 'DISQUALIFIED',
          message: `Candidate is disqualified from taking this test: ${unlockRecord.disqualification_reason}`,
        });
      }

      if (unlockRecord && unlockRecord.passed) {
        return res.status(200).json({
          success: true,
          message: 'You have already passed the skill unlock test for this job.',
          alreadyUnlocked: true,
        });
      }

      const evaluation = evaluateEligibility(profile, job, unlockRecord);

      if (!evaluation.skillUnlockAvailable && !evaluation.eligible) {
        return res.status(403).json({
          success: false,
          error: 'INELIGIBLE_FOR_SKILL_UNLOCK',
          message: 'Candidate does not meet the buffer criteria for a skill unlock assessment.',
          reasons: evaluation.reasons,
        });
      }

      // Generate challenge with tamper-proof token
      const challenge = generateSkillUnlockChallenge(candidateId, job);

      return res.status(200).json({
        success: true,
        ...challenge,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// CANDIDATE: POST /api/candidate/jobs/:id/skill-unlock — Submit Proctored Challenge
// ─────────────────────────────────────────────
router.post(
  '/candidate/jobs/:id/skill-unlock',
  authMiddleware,
  roleGuard('CANDIDATE'),
  async (req, res, next) => {
    try {
      const candidateId = req.user.userId || req.user.id;
      const jobId = req.params.id;
      const {
        testToken,
        answers = {},
        codeSnippet = '',
        explanationText = '',
        tabSwitchCount = 0,
        wasPasted = false,
        typingDurationSeconds = 0,
      } = req.body;

      if (!testToken) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_TEST_TOKEN',
          message: 'Active test session token is required to submit the assessment.',
        });
      }

      const result = await gradeSkillUnlockSubmission({
        candidateId,
        jobId,
        testToken,
        answers,
        codeSnippet,
        explanationText,
        tabSwitchCount: parseInt(tabSwitchCount, 10) || 0,
        wasPasted: Boolean(wasPasted),
        typingDurationSeconds: parseFloat(typingDurationSeconds) || 0,
      });

      return res.status(200).json({
        success: true,
        message: result.passed
          ? 'Congratulations! You passed the Skill Unlock Challenge and can now apply!'
          : result.disqualified
            ? `Assessment Disqualified: ${result.disqualificationReason}`
            : 'Assessment completed. Passing score threshold was not achieved.',
        ...result,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({
          success: false,
          error: 'SUBMISSION_ERROR',
          message: err.message,
        });
      }
      next(err);
    }
  }
);

module.exports = router;
