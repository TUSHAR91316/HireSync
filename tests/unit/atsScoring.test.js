/**
 * HireSync ATS Scoring & Tiering Unit Tests (`tests/unit/atsScoring.test.js`)
 */

const {
  calculateMatchScore,
  classifyCandidateTier,
  detectGamingAttempts,
} = require('../../src/services/atsParser');
const config = require('../../src/config');

describe('ATS Scoring Engine — Unit Tests', () => {
  describe('1. Weighted Match Scoring (`calculateMatchScore`)', () => {
    it('should calculate 100% score when all skills, experience, and education match', () => {
      const candidateData = {
        skills: ['react', 'node.js', 'postgresql'],
        experienceYears: 3.0,
        degreeStream: 'Computer Science',
      };
      const jobRequirements = {
        requiredSkills: ['React', 'Node.js', 'PostgreSQL'],
        minExperience: 2.0,
        allowedDegrees: ['Computer Science'],
      };

      const result = calculateMatchScore(candidateData, jobRequirements);

      expect(result.skillsScore).toBe(100);
      expect(result.experienceScore).toBe(100);
      expect(result.educationScore).toBe(100);
      expect(result.totalScore).toBe(100);
      expect(result.matchedSkills).toEqual(['React', 'Node.js', 'PostgreSQL']);
      expect(result.missingSkills).toEqual([]);
    });

    it('should correctly score partial skill matches with weighted formula', () => {
      const candidateData = {
        skills: ['react'], // 1 of 2 skills matched = 50%
        experienceYears: 2.0, // 100%
        degreeStream: 'Computer Science', // 100%
      };
      const jobRequirements = {
        requiredSkills: ['React', 'Docker'],
        minExperience: 2.0,
        allowedDegrees: ['Computer Science'],
      };

      const result = calculateMatchScore(candidateData, jobRequirements);

      // (50 * 0.5) + (100 * 0.3) + (100 * 0.2) = 25 + 30 + 20 = 75
      expect(result.skillsScore).toBe(50);
      expect(result.experienceScore).toBe(100);
      expect(result.educationScore).toBe(100);
      expect(result.totalScore).toBe(75);
      expect(result.matchedSkills).toEqual(['React']);
      expect(result.missingSkills).toEqual(['Docker']);
    });

    it('should handle zero skill match cleanly', () => {
      const candidateData = {
        skills: ['python'],
        experienceYears: 1.0,
        degreeStream: 'Mechanical Engineering',
      };
      const jobRequirements = {
        requiredSkills: ['React', 'Node.js'],
        minExperience: 2.0,
        allowedDegrees: ['Computer Science'],
      };

      const result = calculateMatchScore(candidateData, jobRequirements);

      expect(result.skillsScore).toBe(0);
      expect(result.experienceScore).toBe(50); // 1.0 / 2.0 = 50%
      expect(result.educationScore).toBe(0);
      // (0 * 0.5) + (50 * 0.3) + (0 * 0.2) = 15
      expect(result.totalScore).toBe(15);
    });
  });

  describe('2. Candidate Tier Classification (`classifyCandidateTier`)', () => {
    it('should classify score >= 80 as TIER_1', () => {
      expect(classifyCandidateTier(80.0)).toBe('TIER_1');
      expect(classifyCandidateTier(95.5)).toBe('TIER_1');
    });

    it('should classify score between 60 and 79.99 as TIER_2', () => {
      expect(classifyCandidateTier(60.0)).toBe('TIER_2');
      expect(classifyCandidateTier(79.99)).toBe('TIER_2');
    });

    it('should classify score < 60 as TIER_3', () => {
      expect(classifyCandidateTier(59.99)).toBe('TIER_3');
      expect(classifyCandidateTier(0)).toBe('TIER_3');
    });
  });

  describe('3. Anti-Gaming Detection (`detectGamingAttempts`)', () => {
    it('should flag candidate with skills count exceeding config limit (>35)', () => {
      const fakeSkills = Array.from({ length: 40 }, (_, i) => `skill_${i}`);
      const extractedData = { skills: fakeSkills };
      const rawText = 'Short resume text with too many skills.';

      const audit = detectGamingAttempts(extractedData, rawText, false);

      expect(audit.flagged).toBe(true);
      expect(audit.skillCountAnomalous).toBe(true);
      expect(audit.flags.some((f) => f.ruleId === 'SEC-AG-001')).toBe(true);
    });

    it('should flag prompt injection directives', () => {
      const extractedData = { skills: ['react'] };
      const rawText = 'Standard resume text.';

      const audit = detectGamingAttempts(extractedData, rawText, true);

      expect(audit.flagged).toBe(true);
      expect(audit.promptInjectionDetected).toBe(true);
      expect(audit.flags.some((f) => f.ruleId === 'SEC-AG-003')).toBe(true);
    });

    it('should return unflagged clean state for normal resumes', () => {
      const extractedData = { skills: ['react', 'node.js', 'postgresql'] };
      const rawText =
        'Experienced Full Stack Software Engineer with over three years of hands-on experience building scalable web applications, REST APIs, microservices, and database systems in modern team environments.';

      const audit = detectGamingAttempts(extractedData, rawText, false);

      expect(audit.flagged).toBe(false);
      expect(audit.flags).toEqual([]);
    });
  });
});
