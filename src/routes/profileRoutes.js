/**
 * HireSync Profile Routes (`src/routes/profileRoutes.js`)
 *
 * Role-isolated profile endpoints:
 * - GET  /api/candidate/profile  — Candidate: fetch own profile
 * - PUT  /api/candidate/profile  — Candidate: update profile fields
 * - GET  /api/hr/profile         — Recruiter: fetch own profile
 * - PUT  /api/hr/profile         — Recruiter: update company/designation
 */

const express = require('express');
const { body } = require('express-validator');
const { query } = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// ─────────────────────────────────────────────
// CANDIDATE: GET /api/candidate/profile
// ─────────────────────────────────────────────
router.get('/candidate/profile', authMiddleware, roleGuard('CANDIDATE'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.email, p.full_name, p.phone, p.years_experience,
              p.batch_year, p.degree_stream, p.notice_period_days, p.resume_url, p.updated_at
       FROM profiles p JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'PROFILE_NOT_FOUND' });
    }

    return res.status(200).json({ success: true, profile: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// CANDIDATE: PUT /api/candidate/profile
// ─────────────────────────────────────────────
const candidateProfileValidators = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty.'),
  body('phone').optional().trim(),
  body('yearsExperience')
    .optional()
    .isFloat({ min: 0, max: 50 })
    .withMessage('Invalid experience value.'),
  body('batchYear').optional().isInt({ min: 2000, max: 2035 }).withMessage('Invalid batch year.'),
  body('degreeStream').optional().trim().notEmpty(),
  body('noticePeriodDays').optional().isInt({ min: 0, max: 365 }),
];

router.put(
  '/candidate/profile',
  authMiddleware,
  roleGuard('CANDIDATE'),
  candidateProfileValidators,
  validateRequest,
  async (req, res, next) => {
    try {
      const { fullName, phone, yearsExperience, batchYear, degreeStream, noticePeriodDays } =
        req.body;

      await query(
        `UPDATE profiles SET
          full_name           = COALESCE($1, full_name),
          phone               = COALESCE($2, phone),
          years_experience    = COALESCE($3, years_experience),
          batch_year          = COALESCE($4, batch_year),
          degree_stream       = COALESCE($5, degree_stream),
          notice_period_days  = COALESCE($6, notice_period_days),
          updated_at          = NOW()
         WHERE user_id = $7`,
        [
          fullName,
          phone,
          yearsExperience,
          batchYear,
          degreeStream,
          noticePeriodDays,
          req.user.userId,
        ]
      );

      return res
        .status(200)
        .json({ success: true, message: 'Candidate profile updated successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// HR: GET /api/hr/profile
// ─────────────────────────────────────────────
router.get('/hr/profile', authMiddleware, roleGuard('RECRUITER'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.email, p.full_name, p.phone, p.company_name, p.updated_at
       FROM profiles p JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'PROFILE_NOT_FOUND' });
    }

    return res.status(200).json({ success: true, profile: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// HR: PUT /api/hr/profile
// ─────────────────────────────────────────────
const hrProfileValidators = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty.'),
  body('phone').optional().trim(),
  body('companyName').optional().trim().notEmpty().withMessage('Company name cannot be empty.'),
];

router.put(
  '/hr/profile',
  authMiddleware,
  roleGuard('RECRUITER'),
  hrProfileValidators,
  validateRequest,
  async (req, res, next) => {
    try {
      const { fullName, phone, companyName } = req.body;

      await query(
        `UPDATE profiles SET
          full_name    = COALESCE($1, full_name),
          phone        = COALESCE($2, phone),
          company_name = COALESCE($3, company_name),
          updated_at   = NOW()
         WHERE user_id = $4`,
        [fullName, phone, companyName, req.user.userId]
      );

      return res.status(200).json({ success: true, message: 'HR profile updated successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
