/**
 * Assessment Engine Unit Tests (`tests/unit/assessmentService.test.js`)
 *
 * Tests:
 * 1. Question Bank Integrity & Taxonomy.
 * 2. Question Sanitization (Strict Redaction of Answer Keys).
 * 3. Token Signing & Verification.
 * 4. Deterministic Auto-Grading & Category Mastery Calculations.
 * 5. Anti-Cheating & Proctoring Violation Triggers.
 */

const {
  QUESTION_BANK,
  getDefaultAssessmentQuestions,
  sanitizeAssessmentQuestions,
  signAssessmentToken,
  verifyAssessmentToken,
  gradeAssessmentSubmission,
} = require('../../src/services/assessmentService');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Assessment Engine Service — Unit Tests', () => {
  describe('1. Question Bank & Taxonomy Integrity', () => {
    test('contains comprehensive questions across all core engineering categories', () => {
      const questions = getDefaultAssessmentQuestions();
      expect(questions.length).toBeGreaterThanOrEqual(8);

      const categories = new Set(questions.map((q) => q.category));
      expect(categories).toContain('Core CS & Algorithms');
      expect(categories).toContain('System Architecture & Scalability');
      expect(categories).toContain('Database Engineering & SQL');
      expect(categories).toContain('Modern Full-Stack & APIs');
      expect(categories).toContain('Reliability & Security');

      // Validate each question contract
      for (const q of questions) {
        expect(q.id).toBeDefined();
        expect(q.question).toBeDefined();
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
        expect(typeof q.explanation).toBe('string');
        expect(q.weight).toBeGreaterThan(0);
      }
    });
  });

  describe('2. Candidate Question Sanitization (Anti-Leak Security)', () => {
    test('strictly redacts correctIndex and explanation from candidate payload', () => {
      const sanitized = sanitizeAssessmentQuestions(QUESTION_BANK);

      expect(sanitized.length).toBe(QUESTION_BANK.length);

      for (const sq of sanitized) {
        // Must NOT leak answer keys or explanations to candidates
        expect(sq).not.toHaveProperty('correctIndex');
        expect(sq).not.toHaveProperty('explanation');

        // Must retain necessary question context
        expect(sq).toHaveProperty('id');
        expect(sq).toHaveProperty('category');
        expect(sq).toHaveProperty('type');
        expect(sq).toHaveProperty('question');
        expect(sq).toHaveProperty('options');
        expect(sq.options.length).toBe(4);
        expect(sq).toHaveProperty('weight');
      }
    });

    test('handles empty or null question arrays safely', () => {
      expect(sanitizeAssessmentQuestions(null)).toEqual([]);
      expect(sanitizeAssessmentQuestions(undefined)).toEqual([]);
      expect(sanitizeAssessmentQuestions([])).toEqual([]);
    });
  });

  describe('3. Assessment Session Token Lifecycle', () => {
    const sessionData = {
      applicationId: 'app-test-101',
      candidateId: 'cand-test-202',
      jobId: 'job-test-303',
      durationMinutes: 30,
    };

    test('signs valid JWT token containing test metadata', () => {
      const token = signAssessmentToken(sessionData);
      expect(typeof token).toBe('string');

      const decoded = verifyAssessmentToken(token);
      expect(decoded.applicationId).toBe(sessionData.applicationId);
      expect(decoded.candidateId).toBe(sessionData.candidateId);
      expect(decoded.jobId).toBe(sessionData.jobId);
      expect(decoded.durationMinutes).toBe(30);
    });

    test('rejects forged or tampered tokens with INVALID_ASSESSMENT_TOKEN', () => {
      const forgedToken = jwt.sign(sessionData, 'invalid_secret_key');

      expect(() => {
        verifyAssessmentToken(forgedToken);
      }).toThrow('INVALID_ASSESSMENT_TOKEN');
    });

    test('rejects expired tokens with ASSESSMENT_TIME_EXPIRED', () => {
      const expiredToken = jwt.sign(sessionData, config.jwt.secret, {
        expiresIn: '-10s', // Expired 10 seconds ago
      });

      expect(() => {
        verifyAssessmentToken(expiredToken);
      }).toThrow('ASSESSMENT_TIME_EXPIRED');
    });
  });

  describe('4. Deterministic Auto-Grading & Category Breakdown', () => {
    test('grades a perfect submission with 100% score and expert category masteries', () => {
      const questions = getDefaultAssessmentQuestions();
      const perfectAnswers = {};
      for (const q of questions) {
        perfectAnswers[q.id] = q.correctIndex;
      }

      const result = gradeAssessmentSubmission({
        questions,
        answers: perfectAnswers,
        durationTakenSeconds: 900,
        tabSwitchCount: 0,
        aiConfidence: 0.05,
        passingScore: 75.0,
      });

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.disqualified).toBe(false);
      expect(result.percentile).toBeGreaterThanOrEqual(98);

      // Verify category masteries
      for (const catData of Object.values(result.categoryScores)) {
        expect(catData.percentage).toBe(100);
        expect(catData.rating).toBe('EXPERT');
      }

      // Verify all questionResults marked correct
      expect(result.questionResults.every((r) => r.isCorrect)).toBe(true);
    });

    test('grades a failing submission below threshold correctly (passed = false)', () => {
      const questions = getDefaultAssessmentQuestions();
      const answers = {};
      // Answer only first 3 correctly out of 10
      questions.forEach((q, i) => {
        if (i < 3) {
          answers[q.id] = q.correctIndex;
        } else {
          // Wrong answer
          answers[q.id] = (q.correctIndex + 1) % 4;
        }
      });

      const result = gradeAssessmentSubmission({
        questions,
        answers,
        durationTakenSeconds: 1200,
        tabSwitchCount: 1,
        passingScore: 75.0,
      });

      expect(result.score).toBe(30);
      expect(result.passed).toBe(false);
      expect(result.disqualified).toBe(false);
      expect(result.questionResults.filter((r) => r.isCorrect).length).toBe(3);
    });

    test('handles unanswered or skipped questions with 0 points awarded', () => {
      const questions = getDefaultAssessmentQuestions();
      // Empty answers object
      const result = gradeAssessmentSubmission({
        questions,
        answers: {},
        durationTakenSeconds: 300,
      });

      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      for (const qr of result.questionResults) {
        expect(qr.isCorrect).toBe(false);
        expect(qr.candidateAnswerIndex).toBeNull();
        expect(qr.candidateAnswerText).toBe('Skipped / Unanswered');
      }
    });
  });

  describe('5. Proctoring & Anti-Cheating Invariants', () => {
    test('disqualifies candidate when tab switch count exceeds policy limit', () => {
      const questions = getDefaultAssessmentQuestions();
      const perfectAnswers = {};
      for (const q of questions) perfectAnswers[q.id] = q.correctIndex;

      const result = gradeAssessmentSubmission({
        questions,
        answers: perfectAnswers,
        tabSwitchCount: 3, // Allowed is 2
        passingScore: 75.0,
      });

      expect(result.disqualified).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.disqualificationReason).toContain('exceeded maximum permitted tab switches');
    });

    test('disqualifies candidate when AI confidence exceeds detection threshold', () => {
      const questions = getDefaultAssessmentQuestions();
      const perfectAnswers = {};
      for (const q of questions) perfectAnswers[q.id] = q.correctIndex;

      const result = gradeAssessmentSubmission({
        questions,
        answers: perfectAnswers,
        aiConfidence: 0.85, // Threshold is 0.75
        passingScore: 75.0,
      });

      expect(result.disqualified).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.disqualificationReason).toContain('AI-generated response similarity detected');
    });
  });
});
