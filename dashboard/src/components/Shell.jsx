import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Roster', end: true },
  { to: '/alerts', label: 'Alerts' },
  { to: '/blocklist', label: 'Blocklist' },
];

export default function Shell() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('classlens_token');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-line bg-paper flex flex-col">
        <div className="px-5 py-6">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-moss" />
            <span className="font-display text-lg font-semibold tracking-tight">ClassLens</span>
          </div>
          <p className="text-[11px] text-ink/50 mt-1 font-mono uppercase tracking-wide">Classroom console</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors focus-ring ${
                  isActive ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-5">
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-ink/50 hover:text-clay hover:bg-clay/5 transition-colors focus-ring"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
