import React, { useState } from 'react';

/**
 * HireSync HR Dashboard Shell (`src/components/hr/HRDashboard.js`)
 *
 * Persistent left sidebar for the HR/Recruiter Portal with:
 * - Navigation: Post a Job, Active Listings, Applicant Pools, SLA Alerts, Analytics, Settings
 * - Top header: company name, recruiter name, role badge, logout
 * - Summary cards: Total Jobs, Total Applications, Pending SLA Decisions, Tier-1 Matches
 */

const NAV_ITEMS = [
  { id: 'post-job', label: 'Post a Job', icon: '➕' },
  { id: 'listings', label: 'Active Listings', icon: '📌' },
  { id: 'applicants', label: 'Applicant Pools', icon: '👥' },
  { id: 'sla-alerts', label: 'SLA Alerts', icon: '⏰' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const SUMMARY_CARDS = [
  { label: 'Active Jobs', value: '—', color: 'bg-indigo-50 text-indigo-700', icon: '📌' },
  { label: 'Total Applications', value: '—', color: 'bg-blue-50 text-blue-700', icon: '📋' },
  { label: 'Pending SLA Decisions', value: '—', color: 'bg-amber-50 text-amber-700', icon: '⏰' },
  { label: 'Tier-1 Matches Today', value: '—', color: 'bg-green-50 text-green-700', icon: '🟢' },
];

export default function HRDashboard({ user, children, activeNav, onNavChange, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('hs_token');
    localStorage.removeItem('hs_user');
    if (onLogout) onLogout();
  };

  const companyName = user?.profile?.companyName || 'Your Company';
  const fullName = user?.profile?.fullName || user?.email || 'Recruiter';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 bg-slate-900 text-white flex flex-col transition-all duration-200`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
          <span className="text-2xl">🏢</span>
          {isSidebarOpen && (
            <div>
              <div className="font-bold text-lg leading-tight">HireSync</div>
              <div className="text-xs text-slate-400 truncate max-w-[140px]">{companyName}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavChange && onNavChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors
                ${
                  activeNav === item.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              style={{ width: 'calc(100% - 1rem)' }}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-500 hover:text-gray-800 p-1 rounded"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
          <div className="flex items-center gap-4">
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
              HR Recruiter
            </span>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-800">{fullName}</div>
              <div className="text-xs text-gray-400">{companyName}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children || (
            <div>
              {/* Welcome */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Welcome back, {fullName.split(' ')[0]}!
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Here's your recruitment activity overview.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                {SUMMARY_CARDS.map((card) => (
                  <div
                    key={card.label}
                    className={`${card.color} rounded-xl p-4 border border-current/10`}
                  >
                    <div className="text-2xl mb-1">{card.icon}</div>
                    <div className="text-2xl font-extrabold">{card.value}</div>
                    <div className="text-xs font-semibold mt-1 opacity-80">{card.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-8 bg-white rounded-xl border border-gray-100 shadow-sm text-center text-gray-400">
                <p className="text-4xl mb-3">📌</p>
                <p className="font-semibold text-gray-600">Select an action from the sidebar</p>
                <p className="text-sm mt-1">
                  Post a job, review applicant pools, or manage SLA alerts.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
