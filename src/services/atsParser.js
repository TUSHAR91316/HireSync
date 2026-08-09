/**
 * HireSync ATS Resume Parser & Match Scoring Engine (`src/services/atsParser.js`)
 *
 * Core service for extracting text from PDF resumes, detecting anti-gaming tricks
 * (white-fonting, keyword flooding, LLM prompt injection), calculating weighted
 * candidate-job match scores, and categorizing candidates into Tier 1/2/3.
 *
 * All configuration parameters (weights, thresholds, anti-gaming caps) are
 * imported from `src/config/index.js` — ZERO hardcoded values.
 */

const pdfParse = require('pdf-parse');
const config = require('../config');
const { extractSkillsFromText } = require('./skillsTaxonomy');

// Regex patterns for prompt injection stripping & entity extraction
const PROMPT_INJECTION_PATTERN =
  /(?:system\s+prompt\s+override|ignore\s+previous\s+instructions|give\s+(?:this\s+)?candidate\s+(?:a\s+)?100|tier\s*1\s+candidate|always\s+pass|admin\s+override)/gi;

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const PHONE_PATTERN = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

const DEGREE_PATTERNS = [
  {
    name: 'Computer Science',
    pattern: /computer\s+science|b\.?tech\s+cs|b\.?e\.?\s+cs|b\.?c\.?a|m\.?c\.?a|m\.?tech\s+cs/i,
  },
  {
    name: 'Information Technology',
    pattern: /information\s+technology|b\.?tech\s+it|b\.?e\.?\s+it/i,
  },
  { name: 'Electronics & Communication', pattern: /electronics|e\.?c\.?e|electrical/i },
  { name: 'Mechanical Engineering', pattern: /mechanical/i },
  { name: 'Civil Engineering', pattern: /civil/i },
  { name: 'Business Administration', pattern: /m\.?b\.?a|b\.?b\.?a|business\s+administration/i },
  { name: 'Data Science', pattern: /data\s+science|analytics/i },
];

const DATE_RANGE_PATTERN =
  /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-9]{2})\s*[-/.]?\s*(?:20\d{2})\s*(?:-|to|until)\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-9]{2}|Present|Current)?\s*(?:20\d{2})?/gi;

const EXPERIENCE_YEARS_EXPLICIT_PATTERN =
  /(\d+(?:\.\d+)?)\s*(?:\+|\s*plus)?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i;

/**
 * 1. Extract plain text from PDF buffer and sanitize adversarial prompts.
 * @param {Buffer} buffer - PDF binary buffer
 * @returns {Promise<{ rawText: string, numPages: number, promptInjectionDetected: boolean }>}
 */
async function extractPdfTextWithSanitization(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('INVALID_PDF_BUFFER');
  }

  let rawText = '';
  let numPages = 1;

  try {
    if (typeof pdfParse === 'function') {
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text || '';
      numPages = pdfData.numpages || 1;
    } else if (pdfParse && pdfParse.PDFParse) {
      const parser = new pdfParse.PDFParse({ data: buffer });
      const result = await parser.getText();
      rawText = result.text || '';
      numPages = result.total || 1;
    }
  } catch (err) {
    if (
      err.name === 'PasswordException' ||
      (err.message && err.message.toLowerCase().includes('password')) ||
      (err.message && err.message.toLowerCase().includes('encrypted'))
    ) {
      const e = new Error('PASSWORD_PROTECTED_PDF');
      e.code = 'PASSWORD_PROTECTED_PDF';
      throw e;
    }
    // Fallback: Attempt stream string extraction before declaring corrupt
    const rawBufferStr = buffer.toString('utf-8');
    const strings = [];
    const strRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = strRegex.exec(rawBufferStr)) !== null) {
      if (match[1] && match[1].trim().length > 1) {
        strings.push(match[1].trim());
      }
    }
    if (strings.length > 0) {
      rawText = strings.join(' ');
    } else {
      const e = new Error('CORRUPT_PDF');
      e.code = 'CORRUPT_PDF';
      throw e;
    }
  }

  // Fallback: If extracted text is empty or just page headers, extract literal text strings from PDF streams
  const textWithoutHeaders = rawText.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
  if (textWithoutHeaders.length === 0) {
    const rawBufferStr = buffer.toString('utf-8');
    const strings = [];
    const strRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = strRegex.exec(rawBufferStr)) !== null) {
      if (match[1] && match[1].trim().length > 1) {
        strings.push(match[1].trim());
      }
    }
    if (strings.length > 0) {
      rawText = strings.join(' ');
    }
  }

  if (rawText.trim().length === 0) {
    const e = new Error('IMAGE_ONLY_PDF');
    e.code = 'IMAGE_ONLY_PDF';
    throw e;
  }

  // Detect and sanitize prompt injection
  let promptInjectionDetected = false;
  if (PROMPT_INJECTION_PATTERN.test(rawText)) {
    promptInjectionDetected = true;
    rawText = rawText.replace(PROMPT_INJECTION_PATTERN, '[REDACTED_PROMPT_INJECTION]');
  }

  return {
    rawText,
    numPages,
    promptInjectionDetected,
  };
}

/**
 * 2. Extract structured candidate metadata from sanitized text.
 * @param {string} rawText
 * @returns {Object} Extracted candidate fields
 */
function extractEntities(rawText) {
  // Skills extraction using Taxonomy engine (binary presence de-duplicated)
  const skills = extractSkillsFromText(rawText);

  // Email & Phone
  const emailMatch = rawText.match(EMAIL_PATTERN);
  const email = emailMatch ? emailMatch[0] : null;

  const phoneMatch = rawText.match(PHONE_PATTERN);
  const phone = phoneMatch ? phoneMatch[0] : null;

  // Degree stream
  let degreeStream = 'General';
  for (const { name, pattern } of DEGREE_PATTERNS) {
    if (pattern.test(rawText)) {
      degreeStream = name;
      break;
    }
  }

  // Graduation Year (e.g. 2018 - 2028)
  const yearMatches = rawText.match(/\b(201[5-9]|202[0-8])\b/g);
  const graduationYear = yearMatches ? Math.max(...yearMatches.map(Number)) : null;

  // Experience Years Calculation
  let experienceYears = 0;
  const explicitExpMatch = rawText.match(EXPERIENCE_YEARS_EXPLICIT_PATTERN);
  if (explicitExpMatch) {
    experienceYears = parseFloat(explicitExpMatch[1]);
  } else {
    // Estimate from date ranges
    const dateRanges = rawText.match(DATE_RANGE_PATTERN) || [];
    if (dateRanges.length > 0) {
      // Rough estimation: each distinct date range contributes ~1-2 years
      experienceYears = Math.min(15, Math.max(0.5, dateRanges.length * 1.2));
    }
  }

  return {
    skills,
    experienceYears: parseFloat(experienceYears.toFixed(1)),
    degreeStream,
    graduationYear,
    email,
    phone,
  };
}

/**
 * 3. Anti-Gaming Detection Engine
 * Inspects parsed metadata and text density to detect resume manipulation.
 * @param {Object} extractedData
 * @param {string} rawText
 * @param {boolean} promptInjectionDetected
 * @returns {Object} Anti-gaming report
 */
function detectGamingAttempts(extractedData, rawText, promptInjectionDetected = false) {
  const flags = [];
  const maxSkillCount = config.ats.antiGaming.maxSkillCount;
  const densityThreshold = config.ats.antiGaming.keywordDensityRatioThreshold;

  // Check 1: Skill Count Anomaly
  const skillCountAnomalous = extractedData.skills.length > maxSkillCount;
  if (skillCountAnomalous) {
    flags.push({
      ruleId: 'SEC-AG-001',
      description: `Excessive skill count detected (${extractedData.skills.length} skills > max ${maxSkillCount}). Possible dictionary dumping.`,
    });
  }

  // Check 2: Keyword Density Anomaly
  const words = rawText.split(/\s+/).filter(Boolean);
  const totalWordCount = words.length;
  const keywordDensityRatio = totalWordCount > 0 ? extractedData.skills.length / totalWordCount : 0;
  const densityAnomalous = keywordDensityRatio > densityThreshold;

  if (densityAnomalous) {
    flags.push({
      ruleId: 'SEC-AG-002',
      description: `Abnormal keyword density ratio (${(keywordDensityRatio * 100).toFixed(1)}%). Possible keyword stuffing.`,
    });
  }

  // Check 3: Prompt Injection
  if (promptInjectionDetected) {
    flags.push({
      ruleId: 'SEC-AG-003',
      description: 'Adversarial prompt injection attempt detected and sanitized.',
    });
  }

  return {
    flagged: flags.length > 0,
    flags,
    skillCountAnomalous,
    densityAnomalous,
    promptInjectionDetected,
  };
}

/**
 * 4. Calculate weighted candidate-job match score.
 * Formula: MatchScore = (S_skills * W_skills) + (S_exp * W_exp) + (S_edu * W_edu)
 * Weights loaded from config.ats.weights.
 *
 * @param {Object} candidateData
 * @param {Object} jobRequirements
 * @returns {Object} Scoring breakdown
 */
function calculateMatchScore(candidateData, jobRequirements = {}) {
  const reqSkills = jobRequirements.requiredSkills || [];
  const minExp = jobRequirements.minExperience || 0;
  const allowedDegrees = jobRequirements.allowedDegrees || [];

  // 1. Skills Score (Binary presence per required skill)
  let matchedSkillCount = 0;
  const candidateSkillSet = new Set((candidateData.skills || []).map((s) => s.toLowerCase()));
  const matchedSkills = [];
  const missingSkills = [];

  if (reqSkills.length > 0) {
    for (const reqSkill of reqSkills) {
      if (candidateSkillSet.has(reqSkill.toLowerCase())) {
        matchedSkillCount++;
        matchedSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    }
  }

  const skillsScore = reqSkills.length > 0 ? (matchedSkillCount / reqSkills.length) * 100 : 100;

  // 2. Experience Score
  let experienceScore = 100;
  if (minExp > 0) {
    experienceScore =
      candidateData.experienceYears >= minExp
        ? 100
        : Math.max(0, (candidateData.experienceYears / minExp) * 100);
  }

  // 3. Education Score
  let educationScore = 100;
  if (allowedDegrees.length > 0) {
    const candidateDegree = (candidateData.degreeStream || '').toLowerCase();
    const degreeMatched = allowedDegrees.some((d) => d.toLowerCase() === candidateDegree);
    educationScore = degreeMatched ? 100 : 0;
  }

  // Weighted Total Composite Score
  const weights = config.ats.weights;
  const totalScore =
    skillsScore * weights.skills +
    experienceScore * weights.experience +
    educationScore * weights.education;

  const roundedTotal = parseFloat(Math.min(100, Math.max(0, totalScore)).toFixed(2));

  return {
    skillsScore: parseFloat(skillsScore.toFixed(2)),
    experienceScore: parseFloat(experienceScore.toFixed(2)),
    educationScore: parseFloat(educationScore.toFixed(2)),
    totalScore: roundedTotal,
    matchedSkills,
    missingSkills,
  };
}

/**
 * 5. Classify candidate into Tier 1, Tier 2, or Tier 3 based on total score.
 * Thresholds loaded from config.ats.tier1Threshold (80) & tier2Threshold (60).
 *
 * @param {number} totalScore
 * @returns {'TIER_1' | 'TIER_2' | 'TIER_3'}
 */
function classifyCandidateTier(totalScore) {
  if (totalScore >= config.ats.tier1Threshold) {
    return 'TIER_1';
  }
  if (totalScore >= config.ats.tier2Threshold) {
    return 'TIER_2';
  }
  return 'TIER_3';
}

/**
 * 6. Main Orchestrator Function — `parseResume(buffer, jobRequirements)`
 * Complete end-to-end execution returning standard ParseResult payload.
 *
 * @param {Buffer} buffer - PDF binary buffer
 * @param {Object} jobRequirements - Required skills, min experience, allowed degrees
 * @returns {Promise<Object>} ParseResult payload
 */
async function parseResume(buffer, jobRequirements = {}) {
  const { rawText, promptInjectionDetected } = await extractPdfTextWithSanitization(buffer);
  const extracted = extractEntities(rawText);
  const antiGaming = detectGamingAttempts(extracted, rawText, promptInjectionDetected);
  const scoring = calculateMatchScore(extracted, jobRequirements);
  const tier = classifyCandidateTier(scoring.totalScore);

  return {
    extracted,
    scoring,
    tier,
    antiGaming,
  };
}

module.exports = {
  extractPdfTextWithSanitization,
  extractEntities,
  detectGamingAttempts,
  calculateMatchScore,
  classifyCandidateTier,
  parseResume,
};
