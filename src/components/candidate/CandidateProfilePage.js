import React, { useState, useEffect } from 'react';

/**
 * HireSync Candidate Profile Page (`src/components/candidate/CandidateProfilePage.js`)
 *
 * Displays and allows editing of candidate profile fields.
 * Integrates with the existing ResumeUploader component.
 * Saves changes via PUT /api/candidate/profile.
 */
export default function CandidateProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('hs_token');
      const res = await fetch('/api/candidate/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load profile.');
      setProfile(data.profile);
      setForm({
        fullName: data.profile.full_name || '',
        phone: data.profile.phone || '',
        yearsExperience: data.profile.years_experience || '',
        batchYear: data.profile.batch_year || '',
        degreeStream: data.profile.degree_stream || '',
        noticePeriodDays: data.profile.notice_period_days || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const token = localStorage.getItem('hs_token');
      const res = await fetch('/api/candidate/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          yearsExperience: parseFloat(form.yearsExperience) || undefined,
          batchYear: parseInt(form.batchYear) || undefined,
          degreeStream: form.degreeStream,
          noticePeriodDays: parseInt(form.noticePeriodDays) || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save profile.');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
          <p className="text-sm text-gray-500 mt-1">Update your candidate details and resume.</p>
        </div>
        {profile?.resume_url && (
          <a
            href={profile.resume_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50"
          >
            📄 View Current Resume
          </a>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          ⚠️ {error}
        </div>
      )}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
          ✅ Profile saved successfully!
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91-9000000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Years of Experience
            </label>
            <input
              name="yearsExperience"
              type="number"
              step="0.5"
              min="0"
              value={form.yearsExperience}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Graduation Year
            </label>
            <input
              name="batchYear"
              type="number"
              value={form.batchYear}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Notice Period (Days)
            </label>
            <input
              name="noticePeriodDays"
              type="number"
              min="0"
              value={form.noticePeriodDays}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Degree Stream</label>
          <input
            name="degreeStream"
            value={form.degreeStream}
            onChange={handleChange}
            placeholder="e.g. Computer Science"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
