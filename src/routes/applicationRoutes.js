/**
 * HireSync Application Routes (`src/routes/applicationRoutes.js`)
 *
 * Provides:
 * 1. POST /api/candidate/jobs/:id/apply — Submit application with STRICT Gatekeeper verification.
 * 2. GET  /api/candidate/applications — View own application pipeline status.
 * 3. GET  /api/hr/jobs/:id/applicants — Recruiter view of tiered applicant pool.
 * 4. PUT  /api/hr/applications/:id/status — Recruiter update applicant pipeline stage.
 */

const express = require('express');
const { query } = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const { evaluateEligibility } = require('../services/gatekeeperService');

const router = express.Router();

// ─────────────────────────────────────────────
// CANDIDATE: POST /api/candidate/jobs/:id/apply — Apply with Gatekeeper Check
// ─────────────────────────────────────────────
router.post(
  '/candidate/jobs/:id/apply',
  authMiddleware,
  roleGuard('CANDIDATE'),
  async (req, res, next) => {
    try {
      const candidateId = req.user.userId || req.user.id;
      const jobId = req.params.id;

      // 1. Fetch Job
      const jobRes = await query(`SELECT * FROM jobs WHERE id = $1 AND is_active = TRUE`, [jobId]);
      if (jobRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'JOB_NOT_FOUND',
          message: 'Job posting does not exist or has been closed.',
        });
      }
      const job = jobRes.rows[0];

      // 2. Fetch Candidate Profile
      const profileRes = await query(`SELECT * FROM profiles WHERE user_id = $1`, [candidateId]);
      const candidateProfile = profileRes.rows[0] || null;

      // 3. Fetch Skill Unlock Record (if candidate took proctored test)
      const unlockRes = await query(
        `SELECT * FROM skill_unlocks WHERE candidate_id = $1 AND job_id = $2`,
        [candidateId, jobId]
      );
      const unlockRecord = unlockRes.rows[0] || null;

      // 4. STRICT GATEKEEPER VERIFICATION
      const evaluation = evaluateEligibility(candidateProfile, job, unlockRecord);

      if (!evaluation.eligible) {
        return res.status(403).json({
          success: false,
          error: 'GATEKEEPER_REJECTION',
          message:
            'Application rejected: You do not meet the required eligibility criteria for this role.',
          eligibilityStatus: evaluation.status,
          reasons: evaluation.reasons,
          criteriaChecklist: evaluation.criteriaChecklist,
        });
      }

      // 5. Prevent Duplicate Applications
      const existingAppRes = await query(
        `SELECT id, status, applied_at FROM applications WHERE job_id = $1 AND candidate_id = $2`,
        [jobId, candidateId]
      );

      if (existingAppRes.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'ALREADY_APPLIED',
          message: 'You have already submitted an application for this position.',
          application: existingAppRes.rows[0],
        });
      }

      // 6. Insert Application
      const resumeUrl = candidateProfile ? candidateProfile.resume_url : null;
      const appInsertRes = await query(
        `INSERT INTO applications (
          job_id, candidate_id, resume_url, status, applied_at
        ) VALUES ($1, $2, $3, 'APPLIED', NOW())
        RETURNING *`,
        [jobId, candidateId, resumeUrl]
      );

      return res.status(201).json({
        success: true,
        message:
          'Application submitted successfully! Your application is now in the Screening stage.',
        application: appInsertRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// CANDIDATE: GET /api/candidate/applications — Pipeline Tracker
// ─────────────────────────────────────────────
router.get(
  '/candidate/applications',
  authMiddleware,
  roleGuard('CANDIDATE'),
  async (req, res, next) => {
    try {
      const candidateId = req.user.userId || req.user.id;

      const result = await query(
        `SELECT a.*,
                j.title AS job_title,
                j.department,
                j.location,
                j.workplace_type,
                j.sla_days,
                p.company_name
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         LEFT JOIN profiles p ON p.user_id = j.recruiter_id
         WHERE a.candidate_id = $1
         ORDER BY a.applied_at DESC`,
        [candidateId]
      );

      return res.status(200).json({
        success: true,
        applications: result.rows,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// HR: GET /api/hr/jobs/:id/applicants — Tiered Applicant Pool
// ─────────────────────────────────────────────
router.get(
  '/hr/jobs/:id/applicants',
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

      const applicantsRes = await query(
        `SELECT a.*,
                u.email,
                p.full_name,
                p.phone,
                p.years_experience,
                p.batch_year,
                p.degree_stream,
                p.notice_period_days,
                su.score AS unlock_score,
                su.passed AS unlock_passed,
                su.tab_switch_count,
                su.ai_confidence
         FROM applications a
         JOIN users u ON u.id = a.candidate_id
         LEFT JOIN profiles p ON p.user_id = a.candidate_id
         LEFT JOIN skill_unlocks su ON su.candidate_id = a.candidate_id AND su.job_id = a.job_id
         WHERE a.job_id = $1
         ORDER BY a.match_score DESC NULLS LAST, a.applied_at DESC`,
        [jobId]
      );

      return res.status(200).json({
        success: true,
        job: jobRes.rows[0],
        applicants: applicantsRes.rows,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// HR: PUT /api/hr/applications/:id/status — Update Pipeline Stage
// ─────────────────────────────────────────────
router.put(
  '/hr/applications/:id/status',
  authMiddleware,
  roleGuard('RECRUITER'),
  async (req, res, next) => {
    try {
      const recruiterId = req.user.userId || req.user.id;
      const applicationId = req.params.id;
      const { status } = req.body;

      const validStatuses = [
        'APPLIED',
        'SCREENED',
        'ASSESSMENT',
        'INTERVIEW',
        'DECISION_PENDING',
        'ACCEPTED',
        'REJECTED',
      ];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: `Status must be one of: ${validStatuses.join(', ')}`,
        });
      }

      // Verify recruiter owns the job for this application
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

      const updateRes = await query(
        `UPDATE applications
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [status, applicationId]
      );

      return res.status(200).json({
        success: true,
        message: `Application pipeline status updated to ${status}.`,
        application: updateRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
