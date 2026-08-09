/**
 * HireSync ATS Parser Integration Tests (`tests/integration/atsParser.test.js`)
 */

const { parseResume } = require('../../src/services/atsParser');

describe('ATS Resume Parser — Integration Tests', () => {
  describe('1. Error Handling & Edge Cases', () => {
    it('should throw INVALID_PDF_BUFFER when passed non-buffer input', async () => {
      await expect(parseResume('not-a-buffer')).rejects.toThrow('INVALID_PDF_BUFFER');
    });

    it('should throw CORRUPT_PDF when passed an unparseable binary buffer', async () => {
      const corruptBuffer = Buffer.from('This is raw text, not a valid PDF file structure.');
      await expect(parseResume(corruptBuffer)).rejects.toThrow('CORRUPT_PDF');
    });
  });

  describe('2. End-to-End Payload Structure', () => {
    it('should extract text from a minimal valid PDF and produce a full ParseResult contract', async () => {
      // Minimal valid single-page PDF binary containing text
      const minimalPdfBase64 =
        'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDAKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNSAwIFIKPj4KPj4KZW5kb2JqCjQgMCBvYmoKPDAKL0xlbmd0aCA2Nwo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFJlYWN0IE5vZGUuanMgUG9zdGdyZVNRTCBEZXZlbG9wZXIpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2AKPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA5MCAwMDAwMCBuIAowMDAwMDAwMTQ3IDAwMDAwIG4gCjAwMDAwMDAyMjEgMDAwMDAwIG4gCjAwMDAwMDAzNTYgMDAwMDAwIG4gCjAwMDAwMDA0NzMgMDAwMDAwIG4gCnRyYWlsZXIKPDAKL1NpemUgNgovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNTYxCiUlRU9GCg==';

      const buffer = Buffer.from(minimalPdfBase64, 'base64');
      const jobRequirements = {
        requiredSkills: ['React', 'Node.js', 'PostgreSQL'],
        minExperience: 1.0,
      };

      const result = await parseResume(buffer, jobRequirements);

      // Verify contract shape
      expect(result).toHaveProperty('extracted');
      expect(result).toHaveProperty('scoring');
      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('antiGaming');

      // Verify extracted skills
      expect(result.extracted.skills).toContain('react');
      expect(result.extracted.skills).toContain('nodejs');
      expect(result.extracted.skills).toContain('postgresql');

      // Verify tier
      expect(['TIER_1', 'TIER_2', 'TIER_3']).toContain(result.tier);
    });
  });
});
