import React from 'react';

/**
 * HireSync HR Candidate Match Modal Component (`src/components/hr/CandidateMatchModal.js`)
 *
 * Detailed recruiter modal showcasing:
 * - Match score radar/bar breakdown (Skills, Experience, Education weightages)
 * - Matched required skills (green pills) vs missing required skills (red pills)
 * - Anti-gaming audit log (white-fonting, keyword density, prompt injection flags)
 * - Recruiter decision pipeline action buttons
 */
export default function CandidateMatchModal({ application, onClose, onUpdateStatus }) {
  if (!application) return null;

  const scoring = application.scoring || {};
  const confirmedData = application.confirmedData || {};
  const antiGaming = application.antiGaming || {};

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'TIER_1':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
            🟢 Tier 1 — Ideal Match
          </span>
        );
      case 'TIER_2':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
            🟡 Tier 2 — Assessment Needed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
            🔴 Tier 3 — Ineligible
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-3xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-xl font-bold text-gray-900">
                {confirmedData.email || application.candidateId}
              </h3>
              {getTierBadge(application.tier)}
            </div>
            <p className="text-xs text-gray-500">
              Application ID: {application.id} • Applied:{' '}
              {new Date(application.appliedAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1 leading-none"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Composite Score Card */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
            <div>
              <div className="text-3xl font-extrabold text-indigo-600">
                {scoring.totalScore || 0}%
              </div>
              <div className="text-xs font-semibold text-indigo-900 uppercase tracking-wide mt-1">
                Composite Score
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-800">{scoring.skillsScore || 0}%</div>
              <div className="text-xs text-gray-500 uppercase mt-1">Skills (50%)</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-800">{scoring.experienceScore || 0}%</div>
              <div className="text-xs text-gray-500 uppercase mt-1">Experience (30%)</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-800">{scoring.educationScore || 0}%</div>
              <div className="text-xs text-gray-500 uppercase mt-1">Education (20%)</div>
            </div>
          </div>

          {/* Matched vs Missing Skills */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
              <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-1.5">
                <span>✅ Matched Required Skills</span>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                  {scoring.matchedSkills?.length || 0}
                </span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {scoring.matchedSkills && scoring.matchedSkills.length > 0 ? (
                  scoring.matchedSkills.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No matched skills.</span>
                )}
              </div>
            </div>

            <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
              <h4 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-1.5">
                <span>❌ Missing Required Skills</span>
                <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
                  {scoring.missingSkills?.length || 0}
                </span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {scoring.missingSkills && scoring.missingSkills.length > 0 ? (
                  scoring.missingSkills.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full border border-red-200"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">None — All skills matched!</span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Overview */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-500 block">Years of Experience</span>
              <span className="font-semibold text-gray-800">
                {confirmedData.experienceYears || 0} Years
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Degree Stream</span>
              <span className="font-semibold text-gray-800">
                {confirmedData.degreeStream || 'General'}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Contact Phone</span>
              <span className="font-semibold text-gray-800">
                {confirmedData.phone || 'Not provided'}
              </span>
            </div>
          </div>

          {/* Anti-Gaming Audit Log */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center justify-between">
              <span>🛡️ Anti-Gaming Audit System Log</span>
              {antiGaming.flagged ? (
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  ⚠️ Flags Triggered ({antiGaming.flags?.length})
                </span>
              ) : (
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  ✅ Clean Audit
                </span>
              )}
            </h4>

            {antiGaming.flagged ? (
              <ul className="space-y-1.5 text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                {antiGaming.flags?.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-bold">{f.ruleId}:</span>
                    <span>{f.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">
                No white-fonting, keyword density anomalies, or prompt injection directives detected
                in this resume.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Current Stage:{' '}
            <span className="font-semibold text-indigo-600">{application.status}</span>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => onUpdateStatus && onUpdateStatus(application.id, 'REJECTED')}
              className="px-4 py-2 border border-red-300 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-50"
            >
              Reject Candidate
            </button>

            <button
              onClick={() => onUpdateStatus && onUpdateStatus(application.id, 'ASSESSMENT')}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
            >
              Advance to Assessment →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
