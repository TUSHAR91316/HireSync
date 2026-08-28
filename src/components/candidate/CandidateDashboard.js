import React, { useState } from 'react';

/**
 * HireSync Candidate Dashboard Shell (`src/components/candidate/CandidateDashboard.js`)
 *
 * Persistent left sidebar navigation + top header for the Candidate Portal.
 * Includes the application stage pipeline tracker at the bottom of the sidebar.
 * The `children` prop renders the active page content in the main area.
 */

const NAV_ITEMS = [
  { id: 'jobs', label: 'Browse Jobs', icon: '🔍' },
  { id: 'applications', label: 'My Applications', icon: '📋' },
  { id: 'assessments', label: 'Assessments', icon: '📝' },
  { id: 'interviews', label: 'Interviews', icon: '🎥' },
  { id: 'profile', label: 'My Profile', icon: '👤' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const PIPELINE_STAGES = ['Applied', 'Screened', 'Assessment', 'Interview', 'Decision'];

export default function CandidateDashboard({ user, children, activeNav, onNavChange, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('hs_token');
    localStorage.removeItem('hs_user');
    if (onLogout) onLogout();
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 bg-indigo-900 text-white flex flex-col transition-all duration-200`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-indigo-800">
          <span className="text-2xl">⚡</span>
          {isSidebarOpen && (
            <div>
              <div className="font-bold text-lg leading-tight">HireSync</div>
              <div className="text-xs text-indigo-300">Candidate Portal</div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavChange && onNavChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors
                ${
                  activeNav === item.id
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`}
              style={{ width: 'calc(100% - 1rem)' }}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Pipeline Tracker */}
        {isSidebarOpen && (
          <div className="px-4 pb-5 border-t border-indigo-800 pt-4">
            <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-3">
              Application Pipeline
            </p>
            <div className="space-y-2">
              {PIPELINE_STAGES.map((stage, i) => (
                <div key={stage} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold text-indigo-200 flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-xs text-indigo-200">{stage}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
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
            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
              Candidate
            </span>
            <span className="text-sm font-medium text-gray-700">
              {user?.profile?.fullName || user?.email || 'Candidate'}
            </span>
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
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-xl font-semibold text-gray-600">
                Welcome back, {user?.profile?.fullName?.split(' ')[0] || 'Candidate'}!
              </h2>
              <p className="text-sm mt-2">Select an option from the sidebar to get started.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
