/**
 * HireSync Request Validation Middleware (`src/middleware/validateRequest.js`)
 *
 * Collects errors from express-validator chains and returns a standardized
 * 400 response if any validation errors exist.
 *
 * Usage (in route handler):
 *   router.post('/register',
 *     body('email').isEmail(),
 *     body('password').isLength({ min: 8 }),
 *     validateRequest,
 *     registerHandler
 *   );
 */

const { validationResult } = require('express-validator');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'One or more fields failed validation.',
      fields: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = validateRequest;
