/**
 * HireSync Password Reset Service (`src/services/passwordResetService.js`)
 *
 * Handles the complete forgot-password flow:
 * 1. Generate a one-time UUID reset token, store in DB with expiry
 * 2. Send transactional email via nodemailer with the reset link
 * 3. Validate the token (not expired, not already used)
 * 4. Consume the token — hash new password, update users table, mark token used
 *
 * All configuration (SMTP credentials, expiry, base URL) loaded from config — zero hardcoding.
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const config = require('../config');
const { query } = require('../db/pool');
const { hashPassword } = require('./authService');

// ─────────────────────────────────────────────
// Nodemailer transporter (initialized once)
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.secure,
  auth: {
    user: config.mail.user,
    pass: config.mail.pass,
  },
});

/**
 * 1. Generate a one-time password reset token for the given user.
 *    Stores the token in `password_reset_tokens` with an expiry timestamp.
 *    Any previous unused tokens for this user are invalidated first.
 *
 * @param {string} userId - UUID of the user
 * @returns {Promise<string>} The generated reset token UUID
 */
async function generateResetToken(userId) {
  // Invalidate any existing active tokens for this user (one token at a time policy)
  await query(
    `UPDATE password_reset_tokens SET used = TRUE
     WHERE user_id = $1 AND used = FALSE AND expires_at > NOW()`,
    [userId]
  );

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + config.auth.resetTokenExpiryMinutes * 60 * 1000);

  await query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );

  return token;
}

/**
 * 2. Send a password reset email to the given address.
 *    The reset link embeds the token as a query parameter.
 *
 * @param {string} email - Recipient email address
 * @param {string} token - UUID reset token
 * @param {string} role  - 'CANDIDATE' or 'RECRUITER' (for branded subject line)
 */
async function sendResetEmail(email, token, role = 'CANDIDATE') {
  const roleLabel =
    role === 'RECRUITER' ? 'HireSync Recruiter Account' : 'HireSync Candidate Account';
  const resetUrl = `${config.mail.appBaseUrl}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: config.mail.from,
    to: email,
    subject: `Password Reset Request — ${roleLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">HireSync Password Reset</h2>
        <p>We received a request to reset the password for your <strong>${roleLabel}</strong>.</p>
        <p>Click the button below to reset your password. This link is valid for
           <strong>${config.auth.resetTokenExpiryMinutes} minutes</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;
                  text-decoration:none;border-radius:6px;margin:16px 0;">
          Reset Password
        </a>
        <p style="color:#6B7280;font-size:13px;">
          If you did not request this, please ignore this email — your password will remain unchanged.
        </p>
        <p style="color:#6B7280;font-size:12px;">
          Or copy this link: <a href="${resetUrl}">${resetUrl}</a>
        </p>
      </div>
    `,
  });
}

/**
 * 3. Validate a password reset token.
 *    Returns the associated user_id if valid.
 *    Throws structured errors for expired or already-used tokens.
 *
 * @param {string} token - UUID reset token from email link
 * @returns {Promise<string>} userId associated with the valid token
 */
async function validateResetToken(token) {
  const result = await query(
    `SELECT user_id, expires_at, used
     FROM password_reset_tokens
     WHERE token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    const e = new Error('INVALID_RESET_TOKEN');
    e.code = 'INVALID_RESET_TOKEN';
    throw e;
  }

  const row = result.rows[0];

  if (row.used) {
    const e = new Error('RESET_TOKEN_ALREADY_USED');
    e.code = 'RESET_TOKEN_ALREADY_USED';
    throw e;
  }

  if (new Date(row.expires_at) < new Date()) {
    const e = new Error('RESET_TOKEN_EXPIRED');
    e.code = 'RESET_TOKEN_EXPIRED';
    throw e;
  }

  return row.user_id;
}

/**
 * 4. Consume a reset token — hash and apply new password, mark token as used.
 *    Both updates happen in a single transaction to ensure atomicity.
 *
 * @param {string} token       - UUID reset token
 * @param {string} newPassword - Plain-text new password
 */
async function consumeResetToken(token, newPassword) {
  const userId = await validateResetToken(token);
  const newHash = await hashPassword(newPassword);

  // Run both updates in a transaction
  const client = await require('../db/pool').pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
      newHash,
      userId,
    ]);
    await client.query(`UPDATE password_reset_tokens SET used = TRUE WHERE token = $1`, [token]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { generateResetToken, sendResetEmail, validateResetToken, consumeResetToken };
