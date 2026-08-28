/**
 * HireSync Auth Security Tests (`tests/security/authSecurity.test.js`)
 *
 * Tests role isolation (RBAC) and token security edge cases:
 * - RECRUITER token blocked on CANDIDATE-only routes
 * - CANDIDATE token blocked on HR-only routes
 * - Expired JWT returns 401 TOKEN_EXPIRED
 * - Tampered JWT signature returns 401 INVALID_TOKEN
 * - Missing token returns 401 UNAUTHORIZED
 */

const { signToken } = require('../../src/services/authService');
const authMiddleware = require('../../src/middleware/authMiddleware');
const roleGuard = require('../../src/middleware/roleGuard');

// Helper: mock Express req/res/next
function mockReqResNext(token, existingUser = null) {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    user: existingUser,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('Auth Security Tests', () => {
  describe('1. JWT Auth Middleware', () => {
    it('should return 401 UNAUTHORIZED when no Authorization header is present', () => {
      const { req, res, next } = mockReqResNext(null);
      authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'UNAUTHORIZED' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 INVALID_TOKEN for a tampered JWT', () => {
      const validToken = signToken({ userId: 'u1', email: 'a@b.com', role: 'CANDIDATE' });
      const tampered = validToken.slice(0, -5) + 'XXXXX';
      const { req, res, next } = mockReqResNext(tampered);
      authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_TOKEN' }));
    });

    it('should return 401 TOKEN_EXPIRED for an expired JWT', () => {
      const jwt = require('jsonwebtoken');
      const config = require('../../src/config');
      const expiredToken = jwt.sign(
        { userId: 'u1', email: 'a@b.com', role: 'CANDIDATE' },
        config.jwt.secret,
        { expiresIn: '-1s' }
      );
      const { req, res, next } = mockReqResNext(expiredToken);
      authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'TOKEN_EXPIRED' }));
    });

    it('should attach req.user and call next() for a valid token', () => {
      const token = signToken({ userId: 'u1', email: 'a@b.com', role: 'CANDIDATE' });
      const { req, res, next } = mockReqResNext(token);
      authMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toMatchObject({ userId: 'u1', email: 'a@b.com', role: 'CANDIDATE' });
    });
  });

  describe('2. Role Guard Middleware (RBAC)', () => {
    it('should return 403 FORBIDDEN_ROLE when CANDIDATE tries to access RECRUITER-only route', () => {
      const { req, res, next } = mockReqResNext(null, {
        userId: 'u2',
        email: 'c@b.com',
        role: 'CANDIDATE',
      });
      const guard = roleGuard('RECRUITER');
      guard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'FORBIDDEN_ROLE' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 FORBIDDEN_ROLE when RECRUITER tries to access CANDIDATE-only route', () => {
      const { req, res, next } = mockReqResNext(null, {
        userId: 'u3',
        email: 'r@b.com',
        role: 'RECRUITER',
      });
      const guard = roleGuard('CANDIDATE');
      guard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'FORBIDDEN_ROLE' }));
    });

    it('should call next() when user role is in allowed list', () => {
      const { req, res, next } = mockReqResNext(null, {
        userId: 'u4',
        email: 'r@b.com',
        role: 'RECRUITER',
      });
      const guard = roleGuard('RECRUITER', 'ADMIN');
      guard(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when req.user is missing entirely', () => {
      const { req, res, next } = mockReqResNext(null, null);
      const guard = roleGuard('CANDIDATE');
      guard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
