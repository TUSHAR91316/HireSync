import React, { useState } from 'react';

/**
 * HireSync Reset Password Page (`src/components/common/ResetPasswordPage.js`)
 *
 * Reads `?token=<uuid>` from the URL query string.
 * Collects new password + confirm password, validates, and calls
 * POST /api/auth/reset-password.
 * Redirects to login on success.
 */
export default function ResetPasswordPage({ onResetSuccess }) {
  const token = new URLSearchParams(window.location.search).get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const getPasswordStrength = (pwd) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 8) return { label: 'Too short', color: 'bg-red-400', width: '25%' };
    if (!/[0-9]/.test(pwd) || !/[^a-zA-Z0-9]/.test(pwd))
      return { label: 'Medium', color: 'bg-yellow-400', width: '60%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (!token) return setError('Invalid or missing reset token. Please request a new reset link.');

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to reset password.');
      setSuccess(true);
      setTimeout(() => {
        if (onResetSuccess) onResetSuccess();
      }, 2500);
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
          <h1 className="text-2xl font-bold">Reset Your Password</h1>
          <p className="text-indigo-200 text-sm mt-1">Enter a new password for your account</p>
        </div>
        <div className="px-8 py-7">
          {success ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <h3 className="text-lg font-semibold text-gray-800">Password Reset Successful!</h3>
              <p className="text-sm text-gray-500">Redirecting you to the login page...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!token && (
                <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200">
                  ⚠️ Invalid or missing reset token. Please request a new password reset link.
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                  ⚠️ {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {strength && (
                  <div className="mt-1.5">
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
