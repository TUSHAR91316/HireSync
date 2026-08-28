/**
 * HireSync Auth Service (`src/services/authService.js`)
 *
 * Core authentication helpers:
 * - Password hashing via bcryptjs (pure JS, no native build)
 * - JWT signing and verification
 *
 * All parameters (saltRounds, secret, expiresIn) come from config — zero hardcoding.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Hash a plain-text password using bcrypt.
 * @param {string} plainText
 * @returns {Promise<string>} bcrypt hash
 */
async function hashPassword(plainText) {
  return bcrypt.hash(plainText, config.jwt.saltRounds);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 * @param {string} plainText
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}

/**
 * Sign a JWT token with the given payload.
 * @param {{ userId: string, email: string, role: string }} payload
 * @returns {string} signed JWT token
 */
function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

/**
 * Verify and decode a JWT token.
 * Throws structured errors for expiry and invalid signatures.
 * @param {string} token
 * @returns {{ userId: string, email: string, role: string }}
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const e = new Error('TOKEN_EXPIRED');
      e.code = 'TOKEN_EXPIRED';
      throw e;
    }
    const e = new Error('INVALID_TOKEN');
    e.code = 'INVALID_TOKEN';
    throw e;
  }
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken };
