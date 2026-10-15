import React from 'react';
import { useApp } from '../../context/AppContext';
import { ROLES, centreName } from '../../utils/calculations';

export const Header = () => {
  const { user, role, switchRole, logout, neonInfo } = useApp();

  if (!user) return null;

  return (
    <header className="header-glass">
      <div className="header-inner">
        <div className="brand-section">
          <div className="brand-logo-mark">S</div>
          <div className="brand-title-wrap">
            <h1>
              Satyam <span>Purchase</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span className="neon-badge" title={`Connected to Neon Lakebase Postgres on branch ${neonInfo.branch || 'production'}`}>
                <span className="neon-dot"></span>
                Neon {neonInfo.branch || 'Prod'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
                {centreName(user.centre)}
              </span>
            </div>
          </div>
        </div>

        <div className="user-action-bar">
          {/* Quick RBAC Role Switcher */}
          <div className="role-switch-container">
            <label htmlFor="role-switcher" style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
              {role === 'Admin' ? '⚡ Role (Admin):' : '🔒 Role:'}
            </label>
            <select
              id="role-switcher"
              className="role-select"
              value={role}
              onChange={(e) => switchRole(e.target.value)}
              title={role === 'Admin' ? 'Admin has master override — switch views freely' : 'Password required to switch roles'}
            >
              <option value="Admin">Admin (Purchase Head)</option>
              <option value="Officer">Field Officer</option>
              <option value="Warehouse">Warehouse In-charge</option>
              <option value="Accounts">Accounts & Finance</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`role-badge ${role}`}>{role}</span>
            <button
              onClick={logout}
              className="btn sec sm"
              style={{ padding: '5px 10px', fontSize: '0.8rem' }}
              title="Log out"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
