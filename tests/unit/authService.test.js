/**
 * HireSync Auth Service Unit Tests (`tests/unit/authService.test.js`)
 */

const {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
} = require('../../src/services/authService');

describe('Auth Service — Unit Tests', () => {
  describe('1. Password Hashing (`hashPassword` + `comparePassword`)', () => {
    it('should produce a bcrypt hash starting with $2b$ prefix', async () => {
      const hash = await hashPassword('TestPass@123');
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should produce a different hash each time (bcrypt salt randomness)', async () => {
      const hash1 = await hashPassword('SamePass@1');
      const hash2 = await hashPassword('SamePass@1');
      expect(hash1).not.toBe(hash2);
    });

    it('should return true when comparing correct password against its hash', async () => {
      const plainText = 'CorrectHorse@99';
      const hash = await hashPassword(plainText);
      const result = await comparePassword(plainText, hash);
      expect(result).toBe(true);
    });

    it('should return false when comparing wrong password against hash', async () => {
      const hash = await hashPassword('CorrectHorse@99');
      const result = await comparePassword('WrongPassword!1', hash);
      expect(result).toBe(false);
    });
  });

  describe('2. JWT Token (`signToken` + `verifyToken`)', () => {
    const payload = { userId: 'test-uuid-1234', email: 'test@hiresync.com', role: 'CANDIDATE' };

    it('should return a JWT string with 3 dot-separated segments', () => {
      const token = signToken(payload);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should decode back to the original payload fields', () => {
      const token = signToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw TOKEN_EXPIRED for an expired token', () => {
      const jwt = require('jsonwebtoken');
      const config = require('../../src/config');
      const expiredToken = jwt.sign(payload, config.jwt.secret, { expiresIn: '-1s' });
      expect(() => verifyToken(expiredToken)).toThrow('TOKEN_EXPIRED');
    });

    it('should throw INVALID_TOKEN for a tampered signature', () => {
      const token = signToken(payload);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyToken(tampered)).toThrow('INVALID_TOKEN');
    });

    it('should throw INVALID_TOKEN for completely malformed string', () => {
      expect(() => verifyToken('not.a.valid.token')).toThrow('INVALID_TOKEN');
    });
  });
});
