/**
 * Unit Tests for HireSync Upstream Eligibility Gatekeeper & Skill Unlock Service
 * Verifies rule evaluations, 15% buffer zone math, degree stream normalization,
 * challenge composition, and proctored grading with anti-cheat enforcement.
 */

const {
  evaluateEligibility,
  checkDegreeMatch,
  normalizeDegree,
  generateSkillUnlockChallenge,
  gradeSkillUnlockSubmission,
} = require('../../src/services/gatekeeperService');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Gatekeeper Service — Upstream Eligibility & Skill Unlock', () => {
  const baseJob = {
    id: 'job-uuid-101',
    title: 'Senior Backend Engineer',
    min_experience: 2.0,
    allowed_batch_years: [2022, 2023, 2024],
    allowed_degrees: ['Computer Science', 'Information Technology'],
    max_notice_period_days: 30,
    sla_days: 7,
  };

  describe('Direct Eligibility Evaluations', () => {
    test('marks candidate ELIGIBLE when all hard criteria are met', () => {
      const profile = {
        years_experience: 3.5,
        batch_year: 2023,
        degree_stream: 'Computer Science',
        notice_period_days: 15,
      };

      const result = evaluateEligibility(profile, baseJob);

      expect(result.status).toBe('ELIGIBLE');
      expect(result.eligible).toBe(true);
      expect(result.skillUnlockAvailable).toBe(false);
      expect(result.reasons.length).toBe(0);
      expect(result.criteriaChecklist.experience.passed).toBe(true);
    });

    test('marks candidate ELIGIBLE when experience matches min_experience exactly', () => {
      const profile = {
        years_experience: 2.0,
        batch_year: 2022,
        degree_stream: 'Information Technology',
        notice_period_days: 30,
      };

      const result = evaluateEligibility(profile, baseJob);

      expect(result.status).toBe('ELIGIBLE');
      expect(result.eligible).toBe(true);
    });
  });

  describe('15% Experience Buffer Zone & Skill Unlock Availability', () => {
    test('marks candidate SKILL_UNLOCK_AVAILABLE when experience is within 15% buffer', () => {
      // 2.0 min experience - 15% buffer = 1.70 yrs lower bound
      const profile = {
        years_experience: 1.8, // within buffer [1.70, 2.0)
        batch_year: 2023,
        degree_stream: 'Computer Science',
        notice_period_days: 15,
      };

      const result = evaluateEligibility(profile, baseJob);

      expect(result.status).toBe('SKILL_UNLOCK_AVAILABLE');
      expect(result.eligible).toBe(false);
      expect(result.skillUnlockAvailable).toBe(true);
      expect(result.criteriaChecklist.experience.inBuffer).toBe(true);
      expect(result.criteriaChecklist.experience.bufferThreshold).toBe(1.7);
      expect(result.reasons[0]).toMatch(/within 15% buffer/i);
    });

    test('marks candidate INELIGIBLE when experience is below the 15% buffer threshold', () => {
      const profile = {
        years_experience: 1.5, // below 1.70 threshold
        batch_year: 2023,
        degree_stream: 'Computer Science',
        notice_period_days: 15,
      };

      const result = evaluateEligibility(profile, baseJob);

      expect(result.status).toBe('INELIGIBLE');
      expect(result.eligible).toBe(false);
      expect(result.skillUnlockAvailable).toBe(false);
      expect(result.criteriaChecklist.experience.inBuffer).toBe(false);
      expect(result.reasons[0]).toMatch(/Experience requirement not met/i);
    });
  });

  describe('Non-Experience Hard Filter Rejections', () => {
    test('rejects candidate with unapproved graduation batch year', () => {
      const profile = {
        years_experience: 3.0,
        batch_year: 2019, // Allowed: 2022, 2023, 2024
        degree_stream: 'Computer Science',
        notice_period_days: 15,
      };

      const result = evaluateEligibility(profile, baseJob);

      expect(result.status).toBe('INELIGIBLE');
      expect(result.eligible).toBe(false);
      expect(result.criteriaChecklist.batchYear.passed).toBe(false);
      expect(result.reasons[0]).toMatch(/outside allowed batches/i);
    });

    test('rejects candidate with unapproved degree stream', () => {
      const profile = {
        years_experience: 3.0,
        batch_year: 2023,
        degree_stream: 'Civil Engineering',
        notice_period_days: 15,
      };

      const result = evaluateEligibility(profile, baseJob);

      expect(result.status).toBe('INELIGIBLE');
      expect(result.criteriaChecklist.degree.passed).toBe(false);
      expect(result.reasons[0]).toMatch(/not in approved list/i);
    });

    test('rejects candidate whose notice period exceeds job maximum', () => {
      const profile = {
        years_experience: 3.0,
        batch_year: 2023,
        degree_stream: 'Computer Science',
        notice_period_days: 60, // Max allowed is 30
      };

      const result = evaluateEligibility(profile, baseJob);

      expect(result.status).toBe('INELIGIBLE');
      expect(result.criteriaChecklist.noticePeriod.passed).toBe(false);
      expect(result.reasons[0]).toMatch(/exceeds job maximum/i);
    });
  });

  describe('Degree Normalization & Flexible Matching', () => {
    test('normalizes degree strings accurately', () => {
      expect(normalizeDegree('B.Tech - Computer Science & Engineering')).toBe(
        'b tech computer science engineering'
      );
    });

    test('matches partial and formatted degree strings', () => {
      const allowed = ['Computer Science', 'Information Technology'];
      expect(checkDegreeMatch('B.Tech in Computer Science', allowed)).toBe(true);
      expect(checkDegreeMatch('M.Sc Information Technology', allowed)).toBe(true);
      expect(checkDegreeMatch('Mechanical Engineering', allowed)).toBe(false);
    });
  });

  describe('Prior Skill Unlock and Disqualification State', () => {
    test('treats candidate as ELIGIBLE if they have a passed unlock record', () => {
      const profile = {
        years_experience: 1.8, // Buffer exp
        batch_year: 2023,
        degree_stream: 'Computer Science',
        notice_period_days: 15,
      };

      const unlockRecord = {
        passed: true,
        score: 80.0,
        disqualified: false,
      };

      const result = evaluateEligibility(profile, baseJob, unlockRecord);

      expect(result.status).toBe('ELIGIBLE');
      expect(result.eligible).toBe(true);
      expect(result.unlockedViaTest).toBe(true);
    });

    test('treats candidate as DISQUALIFIED if their unlock record was flagged for cheating', () => {
      const profile = {
        years_experience: 1.8,
        batch_year: 2023,
        degree_stream: 'Computer Science',
        notice_period_days: 15,
      };

      const unlockRecord = {
        passed: false,
        score: 0.0,
        disqualified: true,
        disqualification_reason: 'Proctoring breach: 3 tab switches detected',
      };

      const result = evaluateEligibility(profile, baseJob, unlockRecord);

      expect(result.status).toBe('DISQUALIFIED');
      expect(result.eligible).toBe(false);
      expect(result.disqualified).toBe(true);
      expect(result.disqualificationReason).toMatch(/Proctoring breach/i);
    });
  });

  describe('Skill Unlock Proctored Challenge Generation & Token Signing', () => {
    test('generates challenge with signed JWT token and stripped answer keys', () => {
      const candidateId = 'cand-123';
      const challenge = generateSkillUnlockChallenge(candidateId, baseJob);

      expect(challenge.testToken).toBeDefined();
      expect(challenge.durationMinutes).toBe(15);
      expect(challenge.questions.length).toBeGreaterThanOrEqual(4);

      // Verify questions do not contain answer keys
      for (const q of challenge.questions) {
        expect(q.correctAnswerIndex).toBeUndefined();
      }

      // Verify token payload
      const decoded = jwt.verify(challenge.testToken, config.jwt.secret);
      expect(decoded.candidateId).toBe(candidateId);
      expect(decoded.jobId).toBe(baseJob.id);
      expect(decoded.type).toBe('SKILL_UNLOCK_SESSION');
    });
  });

  describe('Proctored Submission Grading & Anti-Cheat Validation', () => {
    test('passes submission when answers are correct and anti-cheat is clean', async () => {
      const candidateId = 'cand-123';
      const challenge = generateSkillUnlockChallenge(candidateId, baseJob);

      const result = await gradeSkillUnlockSubmission({
        candidateId,
        jobId: baseJob.id,
        testToken: challenge.testToken,
        answers: {
          q1: 0,
          q2: 1,
          q3: 1,
          q4: 1,
        },
        explanationText:
          'We maintain visited and recursion stack sets in DFS to identify back edges in O(V+E) time.',
        codeSnippet: 'function detect(graph) { const visited = new Set(); return true; }',
        tabSwitchCount: 0,
        wasPasted: false,
        typingDurationSeconds: 120,
      });

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.disqualified).toBe(false);
      expect(result.aiVerdict).toBe('CLEAN');
    });

    test('disqualifies candidate when tab switch count breaches tolerance (> 2 switches)', async () => {
      const candidateId = 'cand-123';
      const challenge = generateSkillUnlockChallenge(candidateId, baseJob);

      const result = await gradeSkillUnlockSubmission({
        candidateId,
        jobId: baseJob.id,
        testToken: challenge.testToken,
        answers: { q1: 0, q2: 1, q3: 1, q4: 1 },
        tabSwitchCount: 3, // Tolerance is 2
        wasPasted: false,
        typingDurationSeconds: 120,
      });

      expect(result.disqualified).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.disqualificationReason).toMatch(/Proctoring violation: 3 tab switch/i);
    });

    test('disqualifies candidate when AI-generated code is submitted', async () => {
      const candidateId = 'cand-123';
      const challenge = generateSkillUnlockChallenge(candidateId, baseJob);

      const result = await gradeSkillUnlockSubmission({
        candidateId,
        jobId: baseJob.id,
        testToken: challenge.testToken,
        answers: { q1: 0, q2: 1, q3: 1, q4: 1 },
        explanationText:
          'Certainly! Here is the solution. In this implementation, we ensure optimal time complexity. Feel free to ask any questions!',
        codeSnippet:
          '// Step 1: Initialize variables\n// Check for edge cases\n// Loop through array\nreturn true;',
        tabSwitchCount: 0,
        wasPasted: false,
        typingDurationSeconds: 120,
      });

      expect(result.disqualified).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.disqualificationReason).toMatch(/AI content detection/i);
      expect(result.aiConfidence).toBeGreaterThanOrEqual(0.75);
    });
  });
});
