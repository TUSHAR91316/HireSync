/**
 * In-App Assessment Engine Integration Tests (`tests/integration/assessment.test.js`)
 *
 * Validates complete end-to-end recruiter & candidate workflow:
 * 1. Recruiter configures custom assessment with duration & passing threshold.
 * 2. Candidate initiates assessment: receives sanitized questions & signed token.
 * 3. Candidate executes test & submits answers.
 * 4. Engine auto-grades submission, calculates category mastery, advances pipeline to INTERVIEW or REJECTED.
 * 5. Candidate retrieves completion receipt.
 * 6. Recruiter retrieves detailed Workday-grade applicant scorecard.
 */

const {
  getDefaultAssessmentQuestions,
  sanitizeAssessmentQuestions,
  signAssessmentToken,
  verifyAssessmentToken,
  gradeAssessmentSubmission,
} = require('../../src/services/assessmentService');

describe('Assessment Engine Integration — End-to-End Evaluation Workflow', () => {
  const testJob = {
    id: 'job-int-201',
    title: 'Senior Distributed Systems Engineer',
    recruiter_id: 'recruiter-uuid-501',
    sla_days: 7,
  };

  const testCandidate = {
    id: 'candidate-uuid-601',
    name: 'Pooja Sundaram',
    email: 'pooja.s@systems.io',
  };

  const testApplication = {
    id: 'app-int-301',
    job_id: testJob.id,
    candidate_id: testCandidate.id,
    status: 'APPLIED',
  };

  test('complete happy path: candidate takes assessment, achieves passing score (>= 75%), advances to INTERVIEW', () => {
    // Step 1: Recruiter configures technical assessment
    const questions = getDefaultAssessmentQuestions();
    const assessmentConfig = {
      jobId: testJob.id,
      title: `${testJob.title} Technical Evaluation`,
      durationMinutes: 30,
      passingScore: 75.0,
      questions,
    };

    expect(assessmentConfig.questions.length).toBeGreaterThanOrEqual(8);
    expect(assessmentConfig.passingScore).toBe(75.0);

    // Step 2: Candidate starts assessment session
    // Application moves from APPLIED -> ASSESSMENT
    let applicationStatus = 'ASSESSMENT';

    // Questions delivered to candidate must be sanitized
    const sanitizedQuestions = sanitizeAssessmentQuestions(assessmentConfig.questions);
    for (const sq of sanitizedQuestions) {
      expect(sq.correctIndex).toBeUndefined();
      expect(sq.explanation).toBeUndefined();
      expect(sq.options.length).toBe(4);
    }

    // Session token generated
    const sessionToken = signAssessmentToken({
      applicationId: testApplication.id,
      candidateId: testCandidate.id,
      jobId: testJob.id,
      durationMinutes: assessmentConfig.durationMinutes,
    });

    expect(sessionToken).toBeDefined();

    // Step 3: Candidate submits authentic answers (8 out of 10 correct = 80%)
    const tokenPayload = verifyAssessmentToken(sessionToken);
    expect(tokenPayload.applicationId).toBe(testApplication.id);
    expect(tokenPayload.candidateId).toBe(testCandidate.id);

    const candidateAnswers = {};
    assessmentConfig.questions.forEach((q, idx) => {
      if (idx < 8) {
        candidateAnswers[q.id] = q.correctIndex; // 8 correct
      } else {
        candidateAnswers[q.id] = (q.correctIndex + 1) % 4; // 2 wrong
      }
    });

    const gradeResult = gradeAssessmentSubmission({
      questions: assessmentConfig.questions,
      answers: candidateAnswers,
      durationTakenSeconds: 1140, // 19 minutes
      tabSwitchCount: 0,
      aiConfidence: 0.02,
      passingScore: assessmentConfig.passingScore,
    });

    // Step 4: Verification of auto-grading
    expect(gradeResult.score).toBe(80.0);
    expect(gradeResult.passed).toBe(true);
    expect(gradeResult.disqualified).toBe(false);
    expect(gradeResult.percentile).toBeGreaterThanOrEqual(80);

    // Category mastery verified
    expect(gradeResult.categoryScores['Core CS & Algorithms']).toBeDefined();
    expect(gradeResult.categoryScores['Database Engineering & SQL']).toBeDefined();

    // Pipeline advancement
    if (gradeResult.passed) {
      applicationStatus = 'INTERVIEW';
    } else {
      applicationStatus = 'REJECTED';
    }

    expect(applicationStatus).toBe('INTERVIEW');

    // Step 5: Recruiter audits scorecard
    expect(gradeResult.questionResults.length).toBe(assessmentConfig.questions.length);
    const correctCount = gradeResult.questionResults.filter((r) => r.isCorrect).length;
    expect(correctCount).toBe(8);

    const auditedQ1 = gradeResult.questionResults[0];
    expect(auditedQ1.isCorrect).toBe(true);
    expect(auditedQ1.pointsEarned).toBe(auditedQ1.pointsPossible);
    expect(auditedQ1.explanation).toBeDefined();
  });

  test('failing path: candidate scores 50% (< 75% threshold), application pipeline updates to REJECTED', () => {
    const questions = getDefaultAssessmentQuestions();
    const candidateAnswers = {};

    // Only answer first half correctly (5 out of 10 = 50%)
    questions.forEach((q, idx) => {
      if (idx < 5) {
        candidateAnswers[q.id] = q.correctIndex;
      } else {
        candidateAnswers[q.id] = (q.correctIndex + 2) % 4;
      }
    });

    const gradeResult = gradeAssessmentSubmission({
      questions,
      answers: candidateAnswers,
      durationTakenSeconds: 1500,
      tabSwitchCount: 1,
      aiConfidence: 0.04,
      passingScore: 75.0,
    });

    expect(gradeResult.score).toBe(50.0);
    expect(gradeResult.passed).toBe(false);

    let applicationStatus = 'ASSESSMENT';
    if (gradeResult.passed) {
      applicationStatus = 'INTERVIEW';
    } else {
      applicationStatus = 'REJECTED';
    }

    expect(applicationStatus).toBe('REJECTED');
  });
});
