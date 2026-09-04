/**
 * Gatekeeper Integration Tests (`tests/integration/gatekeeper.test.js`)
 *
 * Validates complete end-to-end lifecycle:
 * 1. Job criteria definition.
 * 2. Dynamic gatekeeper status computation (Eligible vs Buffer Zone vs Ineligible).
 * 3. Proctored skill challenge issuance with signed session token.
 * 4. Submission grading with anti-cheat & AI detection scan.
 * 5. Dynamic state unlock enabling application submission.
 * 6. Cheating disqualification flow blocking application.
 */

const {
  evaluateEligibility,
  generateSkillUnlockChallenge,
  gradeSkillUnlockSubmission,
} = require('../../src/services/gatekeeperService');

describe('Gatekeeper & Skill Unlock Lifecycle Integration Tests', () => {
  const job = {
    id: 'job-int-101',
    title: 'Cloud Systems Engineer',
    min_experience: 2.0,
    allowed_batch_years: [2022, 2023, 2024],
    allowed_degrees: ['Computer Science', 'Information Technology'],
    max_notice_period_days: 30,
    sla_days: 7,
  };

  test('complete happy path: buffer zone candidate completes proctored challenge and unlocks application', async () => {
    const candidateId = 'cand-uuid-101';

    // Step 1: Candidate is initially in the 15% experience buffer zone
    const bufferCandidateProfile = {
      years_experience: 1.8, // Min is 2.0; buffer threshold is 1.7
      batch_year: 2023,
      degree_stream: 'Computer Science',
      notice_period_days: 15,
    };

    const initialEval = evaluateEligibility(bufferCandidateProfile, job);
    expect(initialEval.status).toBe('SKILL_UNLOCK_AVAILABLE');
    expect(initialEval.eligible).toBe(false);
    expect(initialEval.skillUnlockAvailable).toBe(true);

    // Step 2: Candidate requests Proctored Skill Unlock Challenge
    const challenge = generateSkillUnlockChallenge(candidateId, job);
    expect(challenge.testToken).toBeDefined();
    expect(challenge.questions.length).toBeGreaterThanOrEqual(4);

    // Step 3: Candidate submits authentic, proctor-compliant answers
    const testResult = await gradeSkillUnlockSubmission({
      candidateId,
      jobId: job.id,
      testToken: challenge.testToken,
      answers: { q1: 0, q2: 1, q3: 1, q4: 1 },
      explanationText:
        'To detect cycles, we execute a DFS maintaining a visited set and an active recursion stack set to identify back-edges in O(V+E) time.',
      codeSnippet: 'function detectCycle(graph) { const visited = new Set(); return true; }',
      tabSwitchCount: 0,
      wasPasted: false,
      typingDurationSeconds: 95,
    });

    expect(testResult.passed).toBe(true);
    expect(testResult.score).toBeGreaterThanOrEqual(70);
    expect(testResult.disqualified).toBe(false);
    expect(testResult.aiVerdict).toBe('CLEAN');

    // Step 4: System re-evaluates candidate with the recorded unlock pass
    const unlockRecord = {
      passed: true,
      score: testResult.score,
      disqualified: false,
    };

    const postUnlockEval = evaluateEligibility(bufferCandidateProfile, job, unlockRecord);
    expect(postUnlockEval.status).toBe('ELIGIBLE');
    expect(postUnlockEval.eligible).toBe(true);
    expect(postUnlockEval.unlockedViaTest).toBe(true);
  });

  test('anti-cheat flow: candidate attempting LLM pasting is disqualified and blocked from applying', async () => {
    const candidateId = 'cand-uuid-cheater';

    const bufferCandidateProfile = {
      years_experience: 1.8,
      batch_year: 2023,
      degree_stream: 'Computer Science',
      notice_period_days: 15,
    };

    const challenge = generateSkillUnlockChallenge(candidateId, job);

    // Submits classic LLM prompt output
    const cheatResult = await gradeSkillUnlockSubmission({
      candidateId,
      jobId: job.id,
      testToken: challenge.testToken,
      answers: { q1: 0, q2: 1, q3: 1, q4: 1 },
      explanationText:
        'Certainly! Here is the solution to solve this problem. In this implementation, we ensure optimal runtime complexity. Feel free to ask if you have any questions!',
      codeSnippet:
        '// Step 1: Initialize variables\n// Check for edge cases\n// Loop through items\nreturn true;',
      tabSwitchCount: 0,
      wasPasted: false,
      typingDurationSeconds: 40,
    });

    expect(cheatResult.disqualified).toBe(true);
    expect(cheatResult.passed).toBe(false);
    expect(cheatResult.disqualificationReason).toMatch(/AI content detection/i);

    // Re-evaluating candidate reflects DISQUALIFIED status
    const disqualifiedRecord = {
      passed: false,
      score: 0,
      disqualified: true,
      disqualification_reason: cheatResult.disqualificationReason,
    };

    const postCheatEval = evaluateEligibility(bufferCandidateProfile, job, disqualifiedRecord);
    expect(postCheatEval.status).toBe('DISQUALIFIED');
    expect(postCheatEval.eligible).toBe(false);
    expect(postCheatEval.disqualified).toBe(true);
  });
});
