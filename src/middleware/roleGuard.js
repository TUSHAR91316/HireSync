/**
 * HireSync Role Guard Middleware (`src/middleware/roleGuard.js`)
 *
 * Factory function that returns an Express middleware enforcing
 * role-based access control (RBAC).
 *
 * Usage:
 *   router.get('/hr/applicants', authMiddleware, roleGuard('RECRUITER'), handler)
 *   router.get('/candidate/profile', authMiddleware, roleGuard('CANDIDATE'), handler)
 *
 * Must be used AFTER authMiddleware (requires req.user to be populated).
 */

/**
 * Role guard middleware factory.
 * @param {...string} allowedRoles - One or more roles permitted to access the route
 * @returns {Function} Express middleware
 */
function roleGuard(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN_ROLE',
        message: `Access denied. This route requires one of: [${allowedRoles.join(', ')}]. Your role is: ${req.user.role}.`,
      });
    }

    next();
  };
}

module.exports = roleGuard;
