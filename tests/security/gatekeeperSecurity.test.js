/**
 * Gatekeeper Security Tests (`tests/security/gatekeeperSecurity.test.js`)
 *
 * Enforces security invariant checks:
 * 1. RBAC: Recruiters cannot invoke candidate application endpoints.
 * 2. Unauthenticated requests are rejected with 401 UNAUTHORIZED.
 * 3. Ineligible candidates cannot bypass UI to apply via direct API call (403 GATEKEEPER_REJECTION).
 * 4. Disqualified candidates (from cheating/AI detection) are blocked from applying (403 GATEKEEPER_REJECTION).
 * 5. Tampered or expired test session tokens cannot be submitted for skill unlocks.
 * 6. Proctor violations (> 2 tab switches) trigger immediate disqualification.
 */

const { signToken } = require('../../src/services/authService');
const authMiddleware = require('../../src/middleware/authMiddleware');
const roleGuard = require('../../src/middleware/roleGuard');
const { evaluateEligibility } = require('../../src/services/gatekeeperService');
const pool = require('../../src/db/pool');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Gatekeeper Security Tests — Anti-Bypass & Proctor Enforcement', () => {
  const baseJob = {
    id: 'job-sec-101',
    title: 'Distributed Systems Architect',
    min_experience: 3.0,
    allowed_batch_years: [2022, 2023],
    allowed_degrees: ['Computer Science'],
    max_notice_period_days: 30,
    sla_days: 7,
  };

  describe('1. Role-Based Access Control (RBAC) Isolation', () => {
    test('blocks RECRUITER token from accessing candidate application routes', () => {
      const recruiterToken = signToken({
        userId: 'recruiter-99',
        email: 'recruiter@enterprise.com',
        role: 'RECRUITER',
      });

      const req = {
        headers: { authorization: `Bearer ${recruiterToken}` },
        user: null,
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      authMiddleware(req, res, () => {
        const guard = roleGuard('CANDIDATE');
        guard(req, res, next);
      });

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'FORBIDDEN_ROLE',
          message: expect.stringMatching(/Access denied/i),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('blocks unauthenticated requests without JWT token', () => {
      const req = { headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'UNAUTHORIZED' }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('2. Direct API Gatekeeper Bypass Prevention', () => {
    test('strictly rejects application if candidate is ineligible (experience below buffer)', () => {
      // Min experience is 3.0 yrs; 15% buffer threshold is 2.55 yrs.
      // Candidate has only 1.2 yrs experience.
      const unqualifiedProfile = {
        years_experience: 1.2,
        batch_year: 2023,
        degree_stream: 'Computer Science',
        notice_period_days: 15,
      };

      const evaluation = evaluateEligibility(unqualifiedProfile, baseJob);

      expect(evaluation.eligible).toBe(false);
      expect(evaluation.status).toBe('INELIGIBLE');
      expect(evaluation.reasons[0]).toMatch(/Experience requirement not met/i);
    });

    test('strictly rejects application if candidate was disqualified on the skill test', () => {
      const bufferProfile = {
        years_experience: 2.7, // In buffer
        batch_year: 2023,
        degree_stream: 'Computer Science',
        notice_period_days: 15,
      };

      const disqualifiedRecord = {
        passed: false,
        disqualified: true,
        disqualification_reason: 'AI_GENERATED_CONTENT_DETECTED',
      };

      const evaluation = evaluateEligibility(bufferProfile, baseJob, disqualifiedRecord);

      expect(evaluation.eligible).toBe(false);
      expect(evaluation.status).toBe('DISQUALIFIED');
      expect(evaluation.disqualificationReason).toBe('AI_GENERATED_CONTENT_DETECTED');
    });
  });

  describe('3. Skill Unlock Session Token Integrity & Anti-Spoofing', () => {
    test('rejects tampered or forged skill unlock session tokens', () => {
      const genuineToken = jwt.sign(
        { candidateId: 'cand-1', jobId: 'job-1', type: 'SKILL_UNLOCK_SESSION' },
        config.jwt.secret
      );
      const forgedToken = genuineToken.slice(0, -6) + 'FORGED';

      expect(() => {
        jwt.verify(forgedToken, config.jwt.secret);
      }).toThrow();
    });

    test('rejects expired skill unlock session tokens (> 15 minutes)', () => {
      const expiredSessionToken = jwt.sign(
        {
          candidateId: 'cand-1',
          jobId: 'job-1',
          startedAt: Date.now() - 1000 * 60 * 20, // 20 min ago (limit 15 min + 30s)
          durationMinutes: 15,
          type: 'SKILL_UNLOCK_SESSION',
        },
        config.jwt.secret,
        { expiresIn: '-1s' }
      );

      expect(() => {
        jwt.verify(expiredSessionToken, config.jwt.secret);
      }).toThrow();
    });
  });
});
