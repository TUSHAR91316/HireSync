import React, { useState } from 'react';

/**
 * HireSync HR Recruiter Registration Page (`src/components/hr/HRRegisterPage.js`)
 */
export default function HRRegisterPage({ onRegisterSuccess, onGoToLogin }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    companyName: '',
    designation: '',
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'RECRUITER' }),
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
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-slate-800 px-8 py-6 text-white">
          <h1 className="text-2xl font-bold">Create HR Recruiter Account</h1>
          <p className="text-slate-300 text-sm mt-1">Set up your company presence on HireSync</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              ⚠️ {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
              <input
                name="fullName"
                required
                value={form.fullName}
                onChange={handleChange}
                placeholder="Priya Mehta"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Work Email *</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="hr@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Password *</label>
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Company Name *
              </label>
              <input
                name="companyName"
                required
                value={form.companyName}
                onChange={handleChange}
                placeholder="TechCorp India"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Designation</label>
              <input
                name="designation"
                value={form.designation}
                onChange={handleChange}
                placeholder="Senior HR Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91-9100000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Creating Account...' : 'Create Recruiter Account'}
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
