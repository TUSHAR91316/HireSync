/**
 * HireSync JWT Authentication Middleware (`src/middleware/authMiddleware.js`)
 *
 * Extracts JWT token from `Authorization: Bearer <token>` header,
 * verifies it via authService, and attaches decoded user to `req.user`.
 *
 * Returns structured 401 errors for missing, expired, or invalid tokens.
 */

const { verifyToken } = require('../services/authService');

/**
 * Protect a route — require a valid JWT token.
 * Attaches `req.user = { userId, email, role }` on success.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'No authentication token provided. Please log in.',
    });
  }

  const token = authHeader.slice(7); // Strip 'Bearer ' prefix

  try {
    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    if (err.code === 'TOKEN_EXPIRED') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid authentication token.',
    });
  }
}

module.exports = authMiddleware;
