import React, { useState, useEffect } from 'react';

/**
 * HireSync HR Applicant Pool Tiered View Component (`src/components/hr/ApplicantPoolTieredView.js`)
 *
 * Recruiter dashboard table providing applicant pool view categorized by ATS match scores:
 * - 🟢 Tier 1 (Ideal Match ≥ 80%)
 * - 🟡 Tier 2 (Conditional / Assessment Needed 60-79%)
 * - 🔴 Tier 3 (Ineligible < 60%)
 *
 * Displays match score badges, anti-gaming flag indicators (⚠️), and filter controls.
 */
export default function ApplicantPoolTieredView({ jobId, onSelectCandidate }) {
  const [activeTierTab, setActiveTierTab] = useState('ALL');
  const [applicants, setApplicants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [antiGamingOnlyFilter, setAntiGamingOnlyFilter] = useState(false);

  useEffect(() => {
    fetchApplicants();
  }, [jobId, activeTierTab]);

  const fetchApplicants = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/hr/jobs/${jobId}/applicants?tier=${activeTierTab}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch applicants.');
      }
      setApplicants(data.applicants || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'TIER_1':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
            🟢 Tier 1 (Ideal Match)
          </span>
        );
      case 'TIER_2':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
            🟡 Tier 2 (Assessment)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
            🔴 Tier 3 (Ineligible)
          </span>
        );
    }
  };

  const filteredApplicants = applicants.filter((app) => {
    if (antiGamingOnlyFilter) {
      return app.antiGaming && app.antiGaming.flagged;
    }
    return true;
  });

  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Candidate Applicant Pool</h2>
          <p className="text-sm text-gray-500">
            Automated ATS tiering based on weighted skill, experience, and education matching.
          </p>
        </div>

        <label className="flex items-center space-x-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 cursor-pointer">
          <input
            type="checkbox"
            checked={antiGamingOnlyFilter}
            onChange={(e) => setAntiGamingOnlyFilter(e.target.checked)}
            className="rounded text-amber-600 focus:ring-amber-500"
          />
          <span>⚠️ Show Anti-Gaming Flagged Only</span>
        </label>
      </div>

      {/* Tier Filter Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50/50">
        {[
          { key: 'ALL', label: 'All Applicants' },
          { key: 'TIER_1', label: '🟢 Tier 1 (≥80%)' },
          { key: 'TIER_2', label: '🟡 Tier 2 (60-79%)' },
          { key: 'TIER_3', label: '🔴 Tier 3 (<60%)' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTierTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTierTab === tab.key
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading applicant pool...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-sm">{error}</div>
        ) : filteredApplicants.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No applicants found matching the selected filter.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-semibold border-b text-xs uppercase tracking-wider">
                <th className="py-3.5 px-6">Candidate ID / Email</th>
                <th className="py-3.5 px-6">ATS Match Score</th>
                <th className="py-3.5 px-6">Tier Classification</th>
                <th className="py-3.5 px-6">Anti-Gaming Audit</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredApplicants.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-4 px-6 font-medium text-gray-900">
                    <div>{app.confirmedData?.email || app.candidateId}</div>
                    <div className="text-xs text-gray-400 font-normal">
                      Applied: {new Date(app.appliedAt).toLocaleDateString()}
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900">
                        {app.scoring?.totalScore || 0}%
                      </span>
                      <div className="w-16 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full"
                          style={{ width: `${app.scoring?.totalScore || 0}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6">{getTierBadge(app.tier)}</td>

                  <td className="py-4 px-6">
                    {app.antiGaming && app.antiGaming.flagged ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        ⚠️ Flagged ({app.antiGaming.flags.length})
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        ✅ Clean
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-6 font-medium text-xs text-indigo-600">{app.status}</td>

                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => onSelectCandidate && onSelectCandidate(app)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold rounded-lg transition-colors"
                    >
                      View Breakdown →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
