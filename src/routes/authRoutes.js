/**
 * HireSync Auth Routes (`src/routes/authRoutes.js`)
 *
 * Public and protected endpoints for:
 * - POST /api/auth/register    — Register Candidate or Recruiter
 * - POST /api/auth/login       — Login and receive JWT
 * - GET  /api/auth/me          — Fetch current user profile (JWT required)
 * - POST /api/auth/logout      — Client-side logout signal + audit log
 * - POST /api/auth/forgot-password — Trigger password reset email
 * - POST /api/auth/reset-password  — Consume reset token and set new password
 */

const express = require('express');
const { body } = require('express-validator');
const config = require('../config');
const { query } = require('../db/pool');
const { hashPassword, comparePassword, signToken } = require('../services/authService');
const {
  generateResetToken,
  sendResetEmail,
  consumeResetToken,
} = require('../services/passwordResetService');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
const registerValidators = [
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password')
    .isLength({ min: config.auth.passwordMinLength })
    .withMessage(`Password must be at least ${config.auth.passwordMinLength} characters.`),
  body('role').isIn(['CANDIDATE', 'RECRUITER']).withMessage('Role must be CANDIDATE or RECRUITER.'),
  body('fullName').trim().notEmpty().withMessage('Full name is required.'),
];

router.post('/register', registerValidators, validateRequest, async (req, res, next) => {
  try {
    const { email, password, role, fullName, phone } = req.body;

    // Check for duplicate email
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await hashPassword(password);

    // Insert user
    const userResult = await query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3) RETURNING id, email, role, created_at`,
      [email, passwordHash, role]
    );
    const user = userResult.rows[0];

    // Insert profile — Candidate vs Recruiter fields
    const { yearsExperience, batchYear, degreeStream, noticePeriodDays, companyName, designation } =
      req.body;

    await query(
      `INSERT INTO profiles (user_id, full_name, phone, years_experience, batch_year, degree_stream, notice_period_days, company_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.id,
        fullName,
        phone || null,
        yearsExperience || null,
        batchYear || null,
        degreeStream || null,
        noticePeriodDays || null,
        companyName || null,
      ]
    );

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: { id: user.id, email: user.email, role: user.role, fullName },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
const loginValidators = [
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

router.post('/login', loginValidators, validateRequest, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT u.id, u.email, u.role, u.password_hash, p.full_name, p.company_name,
              p.years_experience, p.batch_year, p.degree_stream, p.notice_period_days
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const user = result.rows[0];
    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: {
          fullName: user.full_name,
          companyName: user.company_name,
          yearsExperience: user.years_experience,
          batchYear: user.batch_year,
          degreeStream: user.degree_stream,
          noticePeriodDays: user.notice_period_days,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.role, u.created_at,
              p.full_name, p.phone, p.company_name, p.years_experience,
              p.batch_year, p.degree_stream, p.notice_period_days, p.resume_url
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found.' });
    }

    const u = result.rows[0];
    return res.status(200).json({
      success: true,
      user: {
        id: u.id,
        email: u.email,
        role: u.role,
        createdAt: u.created_at,
        profile: {
          fullName: u.full_name,
          phone: u.phone,
          companyName: u.company_name,
          yearsExperience: u.years_experience,
          batchYear: u.batch_year,
          degreeStream: u.degree_stream,
          noticePeriodDays: u.notice_period_days,
          resumeUrl: u.resume_url,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
router.post('/logout', authMiddleware, (req, res) => {
  // JWT is stateless — client clears localStorage token.
  // Server-side: log the logout event for audit trail.
  console.log(
    `[AUTH] User ${req.user.email} (${req.user.role}) logged out at ${new Date().toISOString()}`
  );
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required.').normalizeEmail()],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const result = await query('SELECT id, role FROM users WHERE email = $1', [email]);

      // Always return 200 to prevent email enumeration attacks
      if (result.rows.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'If your email is registered, a password reset link has been sent.',
        });
      }

      const user = result.rows[0];
      const token = await generateResetToken(user.id);
      await sendResetEmail(email, token, user.role);

      return res.status(200).json({
        success: true,
        message: 'If your email is registered, a password reset link has been sent.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────
const resetPasswordValidators = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('newPassword')
    .isLength({ min: config.auth.passwordMinLength })
    .withMessage(`New password must be at least ${config.auth.passwordMinLength} characters.`),
];

router.post('/reset-password', resetPasswordValidators, validateRequest, async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    await consumeResetToken(token, newPassword);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (err) {
    if (
      ['INVALID_RESET_TOKEN', 'RESET_TOKEN_ALREADY_USED', 'RESET_TOKEN_EXPIRED'].includes(err.code)
    ) {
      return res.status(400).json({ success: false, error: err.code, message: err.message });
    }
    next(err);
  }
});

module.exports = router;
