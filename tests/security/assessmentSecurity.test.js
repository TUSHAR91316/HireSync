/**
 * Assessment Engine Security Tests (`tests/security/assessmentSecurity.test.js`)
 *
 * Enforces critical security invariants:
 * 1. Role Isolation: Candidates cannot configure assessments or view scorecards; Recruiters cannot take tests.
 * 2. Unauthenticated calls are blocked with 401 UNAUTHORIZED.
 * 3. Answer key exfiltration prevention: Candidates never receive answer keys or explanations.
 * 4. Tampered, forged, or mismatched assessment session tokens are rejected.
 * 5. Time expiry: Late submissions exceeding duration + grace period are rejected.
 * 6. Proctor violations: Tab switches > 2 or AI confidence > 75% trigger mandatory disqualification.
 */

const { signToken } = require('../../src/services/authService');
const authMiddleware = require('../../src/middleware/authMiddleware');
const roleGuard = require('../../src/middleware/roleGuard');
const {
  QUESTION_BANK,
  sanitizeAssessmentQuestions,
  signAssessmentToken,
  verifyAssessmentToken,
  gradeAssessmentSubmission,
} = require('../../src/services/assessmentService');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Assessment Engine Security & Proctor Enforcement Tests', () => {
  describe('1. Role-Based Access Control (RBAC) Isolation', () => {
    test('blocks CANDIDATE token from accessing HR assessment configuration & scorecard routes', () => {
      const candidateToken = signToken({
        userId: 'cand-sec-01',
        email: 'candidate@hiresync.io',
        role: 'CANDIDATE',
      });

      const req = {
        headers: { authorization: `Bearer ${candidateToken}` },
        user: null,
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      authMiddleware(req, res, () => {
        const guard = roleGuard('RECRUITER');
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

    test('blocks RECRUITER token from taking candidate technical assessments', () => {
      const recruiterToken = signToken({
        userId: 'recruiter-sec-01',
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
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('rejects unauthenticated requests without authorization header', () => {
      const req = { headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'UNAUTHORIZED',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('2. Answer Key Exfiltration Defense', () => {
    test('ensures sanitized candidate payload NEVER contains correctIndex or explanation keys', () => {
      const sanitized = sanitizeAssessmentQuestions(QUESTION_BANK);

      for (const question of sanitized) {
        expect(question.correctIndex).toBeUndefined();
        expect(question.explanation).toBeUndefined();
        expect(Object.keys(question)).not.toContain('correctIndex');
        expect(Object.keys(question)).not.toContain('explanation');
      }
    });
  });

  describe('3. Token Integrity & Session Anti-Spoofing', () => {
    test('rejects session token with altered signature', () => {
      const genuineToken = signAssessmentToken({
        applicationId: 'app-valid-1',
        candidateId: 'cand-valid-1',
        jobId: 'job-valid-1',
        durationMinutes: 30,
      });

      const tamperedToken = genuineToken.slice(0, -5) + 'AAAAA';

      expect(() => {
        verifyAssessmentToken(tamperedToken);
      }).toThrow('INVALID_ASSESSMENT_TOKEN');
    });

    test('rejects expired session tokens exceeding duration + grace period', () => {
      // Create token expired in the past
      const expiredToken = jwt.sign(
        {
          applicationId: 'app-valid-1',
          candidateId: 'cand-valid-1',
          jobId: 'job-valid-1',
          durationMinutes: 30,
        },
        config.jwt.secret,
        { expiresIn: '-1s' }
      );

      expect(() => {
        verifyAssessmentToken(expiredToken);
      }).toThrow('ASSESSMENT_TIME_EXPIRED');
    });
  });

  describe('4. Proctor Violation Enforcement', () => {
    test('disqualifies candidate with more than 2 tab switches', () => {
      const result = gradeAssessmentSubmission({
        questions: QUESTION_BANK,
        answers: { 'q-algo-01': 0, 'q-algo-02': 1 },
        tabSwitchCount: 3,
        passingScore: 75.0,
      });

      expect(result.disqualified).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.disqualificationReason).toMatch(/maximum permitted tab switches/i);
    });

    test('disqualifies candidate with AI similarity confidence > 75%', () => {
      const result = gradeAssessmentSubmission({
        questions: QUESTION_BANK,
        answers: { 'q-algo-01': 0, 'q-algo-02': 1 },
        aiConfidence: 0.88,
        passingScore: 75.0,
      });

      expect(result.disqualified).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.disqualificationReason).toMatch(/AI-generated response similarity/i);
    });
  });
});
