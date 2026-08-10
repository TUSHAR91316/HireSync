import React, { useState } from 'react';

/**
 * HireSync Candidate Resume Extraction Preview Component (`src/components/candidate/ResumeExtractionPreview.js`)
 *
 * Provides complete candidate transparency by displaying parsed metadata
 * (extracted skills, experience years, education, contact info) prior to submission.
 *
 * Allows candidates to review, add/remove skills, edit fields, and confirm their
 * profile data — eliminating silent ATS parsing errors.
 */
export default function ResumeExtractionPreview({ parseResult, onConfirm, onReupload }) {
  const extracted = parseResult?.extracted || {};
  const scoring = parseResult?.scoring || {};
  const tier = parseResult?.tier || 'TIER_3';
  const antiGaming = parseResult?.antiGaming || {};

  const [skills, setSkills] = useState(extracted.skills || []);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [experienceYears, setExperienceYears] = useState(extracted.experienceYears || 0);
  const [degreeStream, setDegreeStream] = useState(extracted.degreeStream || 'General');
  const [email, setEmail] = useState(extracted.email || '');
  const [phone, setPhone] = useState(extracted.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkillInput.trim()) return;
    const cleaned = newSkillInput.trim().toLowerCase();
    if (!skills.includes(cleaned)) {
      setSkills([...skills, cleaned]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    const confirmedPayload = {
      skills,
      experienceYears: parseFloat(experienceYears),
      degreeStream,
      email,
      phone,
    };
    if (onConfirm) {
      await onConfirm(confirmedPayload);
    }
    setIsSubmitting(false);
  };

  const getTierBadge = (t) => {
    switch (t) {
      case 'TIER_1':
        return {
          label: 'Tier 1 — Ideal Match',
          color: 'bg-green-100 text-green-800 border-green-300',
        };
      case 'TIER_2':
        return {
          label: 'Tier 2 — Assessment Needed',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        };
      default:
        return { label: 'Tier 3 — Ineligible', color: 'bg-red-100 text-red-800 border-red-300' };
    }
  };

  const badge = getTierBadge(tier);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Resume Extraction Preview</h2>
          <p className="text-sm text-gray-500">
            Review and confirm your extracted resume details before final application submission.
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {antiGaming.flagged && (
        <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            ⚠️ Resume Processing Notice
          </h4>
          <ul className="mt-2 text-xs text-amber-700 space-y-1 list-disc list-inside">
            {antiGaming.flags.map((f, i) => (
              <li key={i}>{f.description}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Match Score Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-xl text-center">
        <div>
          <div className="text-2xl font-bold text-indigo-600">{scoring.totalScore || 0}%</div>
          <div className="text-xs text-gray-500 uppercase">Match Score</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-gray-700">{scoring.skillsScore || 0}%</div>
          <div className="text-xs text-gray-500 uppercase">Skills Match</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-gray-700">{scoring.experienceScore || 0}%</div>
          <div className="text-xs text-gray-500 uppercase">Experience Match</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-gray-700">{scoring.educationScore || 0}%</div>
          <div className="text-xs text-gray-500 uppercase">Education Match</div>
        </div>
      </div>

      {/* Editable Fields Grid */}
      <div className="space-y-6">
        {/* Extracted Skills */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Extracted Technical Skills ({skills.length})
          </label>
          <div className="flex flex-wrap gap-2 mb-3 min-h-[48px] p-3 bg-gray-50 rounded-lg border border-gray-200">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="ml-2 text-indigo-500 hover:text-indigo-800 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
            {skills.length === 0 && (
              <span className="text-xs text-gray-400 italic">
                No skills detected. Add skills below.
              </span>
            )}
          </div>

          <form onSubmit={handleAddSkill} className="flex gap-2">
            <input
              type="text"
              placeholder="Add missing skill (e.g. Docker, Python)"
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
            >
              + Add Skill
            </button>
          </form>
        </div>

        {/* Experience & Degree Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Years of Experience
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Degree Stream / Field
            </label>
            <input
              type="text"
              value={degreeStream}
              onChange={(e) => setDegreeStream(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t">
        <button
          type="button"
          onClick={onReupload}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          🔄 Re-upload Resume
        </button>

        <button
          type="button"
          onClick={handleConfirmSubmit}
          disabled={isSubmitting}
          className="px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting Application...' : 'Confirm & Submit Application'}
        </button>
      </div>
    </div>
  );
}
