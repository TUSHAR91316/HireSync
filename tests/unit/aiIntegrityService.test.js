/**
 * Unit Tests for AI Anti-Cheating & Integrity Detection Service
 * Tests LLM pattern detection, comment heuristics, burstiness, and paste velocity checks.
 */

const {
  analyzeSubmissionIntegrity,
  calculateBurstiness,
  calculateAcademicToneRatio,
} = require('../../src/services/aiIntegrityService');

describe('AI Integrity Service — Anti-Cheating & AI Code Detection', () => {
  describe('LLM Pattern Detection & Boilerplate Screening', () => {
    test('detects classic ChatGPT / Claude transitional boilerplate phrases', () => {
      const aiSubmission = {
        explanationText:
          'Certainly! Here is the solution to solve this problem efficiently. Step 1: Initialize the visited set and recursion stack. In this implementation, we ensure optimal O(V+E) time complexity. Feel free to ask if you have any questions!',
        codeSnippet: `
          // Step 1: Initialize variables
          function detectCycle(graph) {
            // Check for edge cases
            if (!graph) return false;
            // Loop through each item
            const visited = new Set();
            // Return the result
            return true;
          }
        `,
        wasPasted: false,
        typingDurationSeconds: 120,
      };

      const result = analyzeSubmissionIntegrity(aiSubmission);

      expect(result.isAiGenerated).toBe(true);
      expect(result.verdict).toBe('DISQUALIFIED');
      expect(result.aiConfidence).toBeGreaterThanOrEqual(0.75);
      expect(result.flags.length).toBeGreaterThanOrEqual(2);
      expect(result.disqualificationReason).toMatch(/AI content detection/i);
    });

    test('classifies authentic, organic human response as CLEAN', () => {
      const humanSubmission = {
        explanationText:
          "I used a standard DFS with 3 states: 0 for unvisited, 1 for in current recursion stack, 2 for fully explored. If we hit a node that is currently state 1, there's a back edge, so cycle detected. Took about O(V+E).",
        codeSnippet: `
          function hasCycle(adjList) {
            const state = {};
            const dfs = (u) => {
              state[u] = 1;
              for (const v of adjList[u] || []) {
                if (state[v] === 1) return true;
                if (!state[v] && dfs(v)) return true;
              }
              state[u] = 2;
              return false;
            };
            return Object.keys(adjList).some(n => !state[n] && dfs(n));
          }
        `,
        wasPasted: false,
        typingDurationSeconds: 180,
      };

      const result = analyzeSubmissionIntegrity(humanSubmission);

      expect(result.isAiGenerated).toBe(false);
      expect(result.verdict).toBe('CLEAN');
      expect(result.aiConfidence).toBeLessThan(0.4);
      expect(result.disqualificationReason).toBeNull();
    });
  });

  describe('High-Velocity Block Paste Detection', () => {
    test('flags code pasted in under 5 seconds as high velocity paste', () => {
      const pastedSubmission = {
        explanationText: 'Here is the graph dfs solution.',
        codeSnippet:
          'function detectCycle(graph, vertices) { const visited = new Array(vertices).fill(false); const recStack = new Array(vertices).fill(false); for (let i = 0; i < vertices; i++) { if (!visited[i] && isCyclicUtil(i, visited, recStack, graph)) return true; } return false; }',
        wasPasted: true,
        typingDurationSeconds: 2,
      };

      const result = analyzeSubmissionIntegrity(pastedSubmission);

      expect(result.flags).toContain('HIGH_VELOCITY_BLOCK_PASTE_DETECTED');
      expect(result.aiConfidence).toBeGreaterThanOrEqual(0.35);
    });
  });

  describe('Burstiness and Academic Ratio Heuristics', () => {
    test('calculates burstiness variance for multi-sentence inputs', () => {
      const variedText =
        'This is short. However, when we consider the asynchronous nature of the Node.js event loop alongside microtasks, execution timing differs. Done.';
      const variance = calculateBurstiness(variedText);
      expect(variance).toBeGreaterThan(0);
    });

    test('detects high academic tone ratio in formal text', () => {
      const formalText =
        'Furthermore, this architecture leverages asynchronous workers, primarily ensuring optimal performance while additionally demonstrating comprehensive error handling.';
      const ratio = calculateAcademicToneRatio(formalText);
      expect(ratio).toBeGreaterThan(0.1);
    });
  });
});
