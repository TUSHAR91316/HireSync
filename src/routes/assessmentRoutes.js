/**
 * HireSync In-App Assessment Routes (`src/routes/assessmentRoutes.js`)
 *
 * Implements:
 * 1. HR Assessment Authoring & Configuration (POST/GET /api/hr/jobs/:id/assessment).
 * 2. HR Workday-Style Detailed Applicant Scorecard (GET /api/hr/applications/:id/scorecard).
 * 3. Candidate Timed Assessment Delivery (GET /api/candidate/applications/:id/assessment).
 * 4. Candidate Auto-Grading & Pipeline Stage Advancement (POST /api/candidate/applications/:id/assessment).
 * 5. Candidate Assessment Completion Receipt (GET /api/candidate/applications/:id/assessment/result).
 */

const express = require('express');
const { query } = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const {
  getOrCreateAssessmentForJob,
  saveCustomAssessment,
  sanitizeAssessmentQuestions,
  signAssessmentToken,
  verifyAssessmentToken,
  gradeAssessmentSubmission,
  recordAssessmentScore,
  getApplicantScorecard,
} = require('../services/assessmentService');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// HR ENDPOINTS (Role: RECRUITER)
// ─────────────────────────────────────────────────────────────

/**
 * HR: POST /api/hr/jobs/:id/assessment
 * Save or update custom skill assessment for a job.
 */
router.post(
  '/hr/jobs/:id/assessment',
  authMiddleware,
  roleGuard('RECRUITER'),
  async (req, res, next) => {
    try {
      const recruiterId = req.user.userId || req.user.id;
      const jobId = req.params.id;
      const { title, description, durationMinutes, passingScore, questions } = req.body;

      // Verify job ownership
      const jobRes = await query(`SELECT * FROM jobs WHERE id = $1 AND recruiter_id = $2`, [
        jobId,
        recruiterId,
      ]);

      if (jobRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'JOB_NOT_FOUND',
          message: 'Job posting not found or unauthorized access.',
        });
      }

      const assessment = await saveCustomAssessment({
        jobId,
        title: title || `${jobRes.rows[0].title} Technical Assessment`,
        description,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
        passingScore: passingScore ? parseFloat(passingScore) : undefined,
        questions,
      });

      return res.status(200).json({
        success: true,
        message: 'Assessment configuration saved successfully.',
        assessment,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * HR: GET /api/hr/jobs/:id/assessment
 * Fetch the full assessment with answer keys for recruiter preview.
 */
router.get(
  '/hr/jobs/:id/assessment',
  authMiddleware,
  roleGuard('RECRUITER'),
  async (req, res, next) => {
    try {
      const recruiterId = req.user.userId || req.user.id;
      const jobId = req.params.id;

      // Verify job ownership
      const jobRes = await query(`SELECT * FROM jobs WHERE id = $1 AND recruiter_id = $2`, [
        jobId,
        recruiterId,
      ]);

      if (jobRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'JOB_NOT_FOUND',
          message: 'Job posting not found or unauthorized access.',
        });
      }

      const assessment = await getOrCreateAssessmentForJob(jobId, jobRes.rows[0].title);

      return res.status(200).json({
        success: true,
        assessment,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * HR: GET /api/hr/applications/:id/scorecard
 * View Workday-grade detailed applicant scorecard with question-by-question audit.
 */
router.get(
  '/hr/applications/:id/scorecard',
  authMiddleware,
  roleGuard('RECRUITER'),
  async (req, res, next) => {
    try {
      const recruiterId = req.user.userId || req.user.id;
      const applicationId = req.params.id;

      // Verify recruiter owns the job associated with this application
      const verifyRes = await query(
        `SELECT a.id, a.job_id
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE a.id = $1 AND j.recruiter_id = $2`,
        [applicationId, recruiterId]
      );

      if (verifyRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'APPLICATION_NOT_FOUND',
          message: 'Application not found or unauthorized access.',
        });
      }

      const scorecard = await getApplicantScorecard(applicationId);

      if (!scorecard) {
        return res.status(404).json({
          success: false,
          error: 'SCORECARD_NOT_FOUND',
          message: 'No completed assessment found for this applicant.',
        });
      }

      return res.status(200).json({
        success: true,
        scorecard,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// CANDIDATE ENDPOINTS (Role: CANDIDATE)
// ─────────────────────────────────────────────────────────────

/**
 * CANDIDATE: GET /api/candidate/applications/:id/assessment
 * Start or resume timed technical assessment.
 * Returns sanitized questions and signed session token.
 */
router.get(
  '/candidate/applications/:id/assessment',
  authMiddleware,
  roleGuard('CANDIDATE'),
  async (req, res, next) => {
    try {
      const candidateId = req.user.userId || req.user.id;
      const applicationId = req.params.id;

      // Fetch application and verify ownership
      const appRes = await query(
        `SELECT a.*, j.title AS job_title
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE a.id = $1 AND a.candidate_id = $2`,
        [applicationId, candidateId]
      );

      if (appRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'APPLICATION_NOT_FOUND',
          message: 'Application not found or unauthorized access.',
        });
      }

      const application = appRes.rows[0];

      // Check if test already completed
      const existingScoreRes = await query(`SELECT * FROM test_scores WHERE application_id = $1`, [
        applicationId,
      ]);

      if (existingScoreRes.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'ASSESSMENT_ALREADY_COMPLETED',
          message: 'You have already completed the technical assessment for this application.',
          score: existingScoreRes.rows[0].score,
          passed: existingScoreRes.rows[0].passed,
        });
      }

      // Check application stage eligibility (APPLIED, SCREENED, or ASSESSMENT)
      const allowedStages = ['APPLIED', 'SCREENED', 'ASSESSMENT'];
      if (!allowedStages.includes(application.status)) {
        return res.status(403).json({
          success: false,
          error: 'INVALID_PIPELINE_STAGE',
          message: `Cannot take assessment in pipeline stage: ${application.status}.`,
        });
      }

      // If application is in APPLIED or SCREENED, advance to ASSESSMENT
      if (application.status !== 'ASSESSMENT') {
        await query(
          `UPDATE applications SET status = 'ASSESSMENT', updated_at = NOW() WHERE id = $1`,
          [applicationId]
        );
      }

      // Retrieve assessment configuration
      const assessment = await getOrCreateAssessmentForJob(
        application.job_id,
        application.job_title
      );

      let questions = assessment.questions;
      if (typeof questions === 'string') {
        try {
          questions = JSON.parse(questions);
        } catch (e) {
          questions = [];
        }
      }

      // Redact answer keys & explanations for candidate security
      const sanitizedQuestions = sanitizeAssessmentQuestions(questions);

      // Sign tamper-proof assessment session token
      const assessmentToken = signAssessmentToken({
        applicationId,
        candidateId,
        jobId: application.job_id,
        durationMinutes: assessment.duration_minutes,
      });

      return res.status(200).json({
        success: true,
        assessmentToken,
        title: assessment.title,
        description: assessment.description,
        durationMinutes: assessment.duration_minutes,
        passingScore: assessment.passing_score,
        totalQuestions: sanitizedQuestions.length,
        questions: sanitizedQuestions,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * CANDIDATE: POST /api/candidate/applications/:id/assessment
 * Submit assessment answers for auto-grading.
 */
router.post(
  '/candidate/applications/:id/assessment',
  authMiddleware,
  roleGuard('CANDIDATE'),
  async (req, res, next) => {
    try {
      const candidateId = req.user.userId || req.user.id;
      const applicationId = req.params.id;
      const {
        assessmentToken,
        answers,
        durationTakenSeconds,
        tabSwitchCount = 0,
        aiConfidence = 0.0,
      } = req.body;

      if (!assessmentToken) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_TOKEN',
          message: 'Assessment session token is required.',
        });
      }

      // Verify token integrity and expiry
      let tokenPayload;
      try {
        tokenPayload = verifyAssessmentToken(assessmentToken);
      } catch (tokenErr) {
        if (tokenErr.code === 'ASSESSMENT_TIME_EXPIRED') {
          return res.status(408).json({
            success: false,
            error: 'ASSESSMENT_TIME_EXPIRED',
            message: 'Assessment session has expired. Submission grace period exceeded.',
          });
        }
        return res.status(401).json({
          success: false,
          error: 'INVALID_ASSESSMENT_TOKEN',
          message: 'Invalid or forged assessment session token.',
        });
      }

      // Invariant: token must match candidate and application
      if (
        tokenPayload.applicationId !== applicationId ||
        tokenPayload.candidateId !== candidateId
      ) {
        return res.status(403).json({
          success: false,
          error: 'TOKEN_MISMATCH',
          message: 'Assessment token does not match the application or candidate identity.',
        });
      }

      // Prevent duplicate submission
      const existingScoreRes = await query(`SELECT id FROM test_scores WHERE application_id = $1`, [
        applicationId,
      ]);
      if (existingScoreRes.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'ASSESSMENT_ALREADY_COMPLETED',
          message: 'Assessment results have already been recorded for this application.',
        });
      }

      // Fetch official assessment questions with answer keys
      const assessment = await getOrCreateAssessmentForJob(tokenPayload.jobId);
      let questions = assessment.questions;
      if (typeof questions === 'string') {
        try {
          questions = JSON.parse(questions);
        } catch (e) {
          questions = [];
        }
      }

      // Execute auto-grading engine
      const gradeResult = gradeAssessmentSubmission({
        questions,
        answers: answers || {},
        durationTakenSeconds: durationTakenSeconds || 0,
        tabSwitchCount: parseInt(tabSwitchCount, 10) || 0,
        aiConfidence: parseFloat(aiConfidence) || 0.0,
        passingScore: assessment.passing_score,
      });

      // Persist in test_scores
      await recordAssessmentScore({
        applicationId,
        candidateId,
        jobId: tokenPayload.jobId,
        score: gradeResult.score,
        passed: gradeResult.passed,
        timeTakenSeconds: gradeResult.durationTakenSeconds,
        questionBreakdown: gradeResult,
      });

      // Advance application pipeline stage based on assessment result
      const newStatus = gradeResult.passed ? 'INTERVIEW' : 'REJECTED';
      await query(
        `UPDATE applications
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [newStatus, applicationId]
      );

      return res.status(200).json({
        success: true,
        score: gradeResult.score,
        earnedPoints: gradeResult.earnedPoints,
        totalPossiblePoints: gradeResult.totalPossiblePoints,
        passingScore: gradeResult.passingScore,
        passed: gradeResult.passed,
        percentile: gradeResult.percentile,
        categoryScores: gradeResult.categoryScores,
        disqualified: gradeResult.disqualified,
        disqualificationReason: gradeResult.disqualificationReason,
        newApplicationStatus: newStatus,
        message: gradeResult.passed
          ? 'Congratulations! You passed the technical assessment and advanced to the Live Interview stage.'
          : 'Assessment completed. Your score did not meet the required passing threshold.',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * CANDIDATE: GET /api/candidate/applications/:id/assessment/result
 * Retrieve applicant completion receipt and category breakdown.
 */
router.get(
  '/candidate/applications/:id/assessment/result',
  authMiddleware,
  roleGuard('CANDIDATE'),
  async (req, res, next) => {
    try {
      const candidateId = req.user.userId || req.user.id;
      const applicationId = req.params.id;

      const scoreRes = await query(
        `SELECT ts.score, ts.passed, ts.time_taken_seconds, ts.question_breakdown, ts.completed_at,
                a.status AS application_status, j.title AS job_title
         FROM test_scores ts
         JOIN applications a ON a.id = ts.application_id
         JOIN jobs j ON j.id = ts.job_id
         WHERE ts.application_id = $1 AND ts.candidate_id = $2
         ORDER BY ts.completed_at DESC
         LIMIT 1`,
        [applicationId, candidateId]
      );

      if (scoreRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'RESULT_NOT_FOUND',
          message: 'No assessment result found for this application.',
        });
      }

      const row = scoreRes.rows[0];
      let breakdown = row.question_breakdown;
      if (typeof breakdown === 'string') {
        try {
          breakdown = JSON.parse(breakdown);
        } catch (e) {
          // Keep as-is
        }
      }

      return res.status(200).json({
        success: true,
        score: row.score,
        passed: row.passed,
        applicationStatus: row.application_status,
        jobTitle: row.job_title,
        timeTakenSeconds: row.time_taken_seconds,
        categoryScores: breakdown ? breakdown.categoryScores : {},
        completedAt: row.completed_at,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
