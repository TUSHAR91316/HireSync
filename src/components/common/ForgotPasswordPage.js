import React, { useState } from 'react';

/**
 * HireSync Forgot Password Page (`src/components/common/ForgotPasswordPage.js`)
 * Shared between Candidate and HR portals.
 */
export default function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed.');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 px-8 py-7 text-white">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-indigo-200 text-sm mt-1">We'll email you a secure reset link</p>
        </div>
        <div className="px-8 py-7">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📧</div>
              <h3 className="text-lg font-semibold text-gray-800">Check your inbox</h3>
              <p className="text-sm text-gray-500">
                If <strong>{email}</strong> is registered, a password reset link has been sent. The
                link expires in 60 minutes.
              </p>
              <button
                onClick={onBackToLogin}
                className="mt-4 text-sm text-indigo-600 font-semibold hover:underline"
              >
                ← Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                  ⚠️ {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Your Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full text-sm text-gray-500 hover:text-gray-800"
              >
                ← Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
