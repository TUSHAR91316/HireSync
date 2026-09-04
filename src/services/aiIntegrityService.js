/**
 * HireSync AI Anti-Cheating & Integrity Detection Service
 *
 * Scans candidate code submissions and technical explanation paragraphs for
 * AI/LLM generation markers (ChatGPT, Claude, Copilot), copy-pasting,
 * and unnatural syntax patterns.
 */

const config = require('../config');

// Common LLM conversational boilerplate, transition phrases, and pedantic commentary
const LLM_TEXT_PATTERNS = [
  /\bhere(?:'s| is) (?:a|the|an) (?:solution|implementation|code|example)\b/i,
  /\bcertainly!? (?:here|below)\b/i,
  /\bin this implementation\b/i,
  /\bto solve this (?:problem|issue|challenge)\b/i,
  /\bstep [0-9]+:\s*(?:initialize|calculate|iterate|return|handle|define)\b/i,
  /\b\/\/\s*step [0-9]+:/i,
  /\b\/\/\s*time complexity:\s*O\(/i,
  /\b\/\/\s*space complexity:\s*O\(/i,
  /\b(?:in summary|in conclusion|to summarize|overall),?\s+this approach\b/i,
  /\bfeel free to (?:ask|modify|reach out|extend)\b/i,
  /\blet me know if (?:you have any questions|you need further)\b/i,
  /\bas (?:an|a) (?:ai|large language model|language model)\b/i,
  /\bit(?:'s| is) important to note that\b/i,
  /\bthis ensures (?:that )?(?:optimal|robust|efficient|clean)\b/i,
  /\b\/\/\s*here is (?:the|a) (?:function|method|code)\b/i,
  /\b\/\/\s*explanation:\b/i,
];

// LLM pedantic code commenting signatures
const LLM_CODE_COMMENT_PATTERNS = [
  /\/\/\s*(?:step \d+:\s*)?(?:initialize|set up) (?:variables?|constants?|pointers?)/i,
  /\/\/\s*(?:step \d+:\s*)?(?:loop|iterate) through (?:the |each )?(?:elements?|items?|array|list)/i,
  /\/\/\s*(?:step \d+:\s*)?check (?:if|for) (?:edge cases?|null|undefined|empty)/i,
  /\/\/\s*(?:step \d+:\s*)?return (?:the )?(?:result|final|computed|answer|boolean)/i,
  /\/\/\s*base case(?:\s*:)?/i,
  /\/\/\s*recursive case(?:\s*:)?/i,
];

/**
 * Calculates sentence length variance (burstiness heuristic).
 * Human writing shows high variance (short and long mixed).
 * AI writing shows very uniform, moderate sentence lengths.
 *
 * @param {string} text
 * @returns {number} Standard deviation of sentence lengths in words
 */
function calculateBurstiness(text) {
  if (!text || typeof text !== 'string') return 0;
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length < 3) return 5.0; // Not enough sample size to penalize

  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;

  return Math.sqrt(variance);
}

/**
 * Calculates vocabulary repetition and transitional word density.
 *
 * @param {string} text
 * @returns {number} Ratio between 0.0 and 1.0
 */
function calculateAcademicToneRatio(text) {
  if (!text) return 0;
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  if (words.length === 0) return 0;

  const academicTokens = [
    'furthermore',
    'moreover',
    'additionally',
    'consequently',
    'therefore',
    'specifically',
    'primarily',
    'efficiently',
    'comprehensive',
    'underlying',
    'guarantees',
    'leverages',
    'ensuring',
    'demonstrates',
    'optimal',
  ];

  const matched = words.filter((w) => academicTokens.includes(w)).length;
  return matched / words.length;
}

/**
 * Analyzes code and technical explanations for AI generation signatures.
 *
 * @param {object} params
 * @param {string} params.codeSnippet - Code submitted by candidate
 * @param {string} [params.explanationText] - Accompanying explanation or technical rationale
 * @param {boolean} [params.wasPasted=false] - Client telemetry indicating block paste without typing
 * @param {number} [params.typingDurationSeconds=0] - Time taken to compose the response
 * @returns {object} Analysis results with AI confidence and verdict
 */
function analyzeSubmissionIntegrity({
  codeSnippet = '',
  explanationText = '',
  wasPasted = false,
  typingDurationSeconds = 0,
}) {
  const flags = [];
  let aiScore = 0.0;
  const combinedContent = `${explanationText}\n${codeSnippet}`;

  // 1. Check for distinctive conversational / explanatory LLM phrase patterns
  let llmPatternMatches = 0;
  for (const pattern of LLM_TEXT_PATTERNS) {
    if (pattern.test(combinedContent)) {
      llmPatternMatches++;
      flags.push(`LLM_PATTERN_MATCH: ${pattern.toString()}`);
    }
  }

  if (llmPatternMatches > 0) {
    // Heavy penalty for hallmark LLM phrases
    aiScore += Math.min(0.85, llmPatternMatches * 0.3);
  }

  // 2. Check for pedantic step-by-step commentary inside code
  if (codeSnippet) {
    let commentMatches = 0;
    for (const pattern of LLM_CODE_COMMENT_PATTERNS) {
      if (pattern.test(codeSnippet)) {
        commentMatches++;
      }
    }
    if (commentMatches >= 2) {
      aiScore += 0.25;
      flags.push('PEDANTIC_LLM_STEP_COMMENTS');
    }
  }

  // 3. Burstiness / Uniformity Heuristic (Low burstiness = AI signature)
  if (explanationText && explanationText.length > 120) {
    const burstiness = calculateBurstiness(explanationText);
    const academicRatio = calculateAcademicToneRatio(explanationText);

    // AI typically produces sentence burstiness < 2.5 with higher academic tone
    if (burstiness < 2.5 && academicRatio > 0.03) {
      aiScore += 0.2;
      flags.push('UNNATURALLY_UNIFORM_SYNTAX_BURSTINESS');
    }
  }

  // 4. Paste Velocity Detection
  // If a substantial code block (> 150 chars) was pasted in under 5 seconds
  if (codeSnippet && codeSnippet.length > 150) {
    if (wasPasted || (typingDurationSeconds > 0 && typingDurationSeconds < 5)) {
      aiScore += 0.35;
      flags.push('HIGH_VELOCITY_BLOCK_PASTE_DETECTED');
    }
  }

  // Clamp AI confidence to [0.00, 1.00]
  const aiConfidence = Math.min(1.0, Math.max(0.0, parseFloat(aiScore.toFixed(2))));
  const threshold = config.antiCheating.aiDetectionThreshold;

  let verdict = 'CLEAN';
  if (aiConfidence >= threshold) {
    verdict = 'DISQUALIFIED';
  } else if (aiConfidence >= 0.4) {
    verdict = 'FLAGGED';
  }

  return {
    isAiGenerated: aiConfidence >= threshold,
    aiConfidence,
    flags,
    verdict,
    threshold,
    disqualificationReason:
      verdict === 'DISQUALIFIED'
        ? `Submission triggered AI content detection (${Math.round(aiConfidence * 100)}% AI confidence)`
        : null,
  };
}

module.exports = {
  analyzeSubmissionIntegrity,
  calculateBurstiness,
  calculateAcademicToneRatio,
  LLM_TEXT_PATTERNS,
  LLM_CODE_COMMENT_PATTERNS,
};
