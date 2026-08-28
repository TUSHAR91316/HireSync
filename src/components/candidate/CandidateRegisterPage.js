import React, { useState } from 'react';

/**
 * HireSync Candidate Registration Page (`src/components/candidate/CandidateRegisterPage.js`)
 *
 * Collects all candidate-specific profile fields at registration time:
 * fullName, email, password (with strength indicator), phone,
 * yearsExperience, batchYear, degreeStream, noticePeriodDays.
 */
export default function CandidateRegisterPage({ onRegisterSuccess, onGoToLogin }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    yearsExperience: '',
    batchYear: '',
    degreeStream: '',
    noticePeriodDays: '',
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const getPasswordStrength = (pwd) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 8) return { label: 'Too short', color: 'bg-red-400', width: '25%' };
    if (!/[0-9]/.test(pwd) || !/[^a-zA-Z0-9]/.test(pwd))
      return { label: 'Medium', color: 'bg-yellow-400', width: '60%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          role: 'CANDIDATE',
          yearsExperience: parseFloat(form.yearsExperience) || 0,
          batchYear: parseInt(form.batchYear) || null,
          noticePeriodDays: parseInt(form.noticePeriodDays) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Registration failed.');
      localStorage.setItem('hs_token', data.token);
      localStorage.setItem('hs_user', JSON.stringify(data.user));
      if (onRegisterSuccess) onRegisterSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 px-8 py-6 text-white">
          <h1 className="text-2xl font-bold">Create Candidate Account</h1>
          <p className="text-indigo-200 text-sm mt-1">
            Set up your HireSync profile to start applying
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              ⚠️ {error}
            </div>
          )}

          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
              <input
                name="fullName"
                required
                value={form.fullName}
                onChange={handleChange}
                placeholder="Rahul Sharma"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Password + Confirm */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Password *</label>
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {strength && (
                <div className="mt-1">
                  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{strength.label}</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Confirm Password *
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Phone + Experience */}
          <div className="grid grid-cols-2 gap-4">
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
                placeholder="e.g. 2.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Degree + Batch Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Degree Stream
              </label>
              <input
                name="degreeStream"
                value={form.degreeStream}
                onChange={handleChange}
                placeholder="e.g. Computer Science"
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
                placeholder="e.g. 2023"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Notice Period */}
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
              placeholder="e.g. 30"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Creating Account...' : 'Create Candidate Account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
