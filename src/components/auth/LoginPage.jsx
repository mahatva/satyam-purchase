import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ROLES, centreName } from '../../utils/calculations';

export const LoginPage = () => {
  const { login, users } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Default demo user credentials with IDs and passwords
  const demoCredentials = [
    {
      name: 'Avi Mangal',
      role: 'Admin',
      centre: 'ALL',
      loginId: 'admin',
      password: 'admin123',
      desc: 'Full administrative authorizations & pricing masters',
    },
    {
      name: 'Rahul (sample)',
      role: 'Officer',
      centre: 'DWL',
      loginId: 'officer_dwl',
      password: 'officer123',
      desc: 'Field Officer Diwal · Can reduce commission for farmers',
    },
    {
      name: 'Suresh (sample)',
      role: 'Warehouse',
      centre: 'DWL',
      loginId: 'warehouse_dwl',
      password: 'warehouse123',
      desc: 'Warehouse In-charge Diwal · Weighbridge & plant dispatches',
    },
    {
      name: 'Accounts (sample)',
      role: 'Accounts',
      centre: 'ALL',
      loginId: 'accounts',
      password: 'accounts123',
      desc: 'Accounts & Finance · Cross-centre ledger & CSV export',
    },
    {
      name: 'Sample officer SC2',
      role: 'Officer',
      centre: 'SC2',
      loginId: 'officer_sc2',
      password: 'officer123',
      desc: 'Field Officer Sample Centre 2 · Standard commission',
    },
  ];

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter both User ID and Password');
      return;
    }

    setLoading(true);
    setError('');
    const res = await login(identifier.trim(), password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Invalid credentials. Please check your ID and Password.');
    }
  };

  const handleQuickFillAndLogin = async (demo) => {
    setIdentifier(demo.loginId);
    setPassword(demo.password);
    setError('');
    setLoading(true);
    const res = await login(demo.loginId, demo.password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Login failed');
    }
  };

  return (
    <div className="login-container">
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div
          className="brand-logo-mark"
          style={{ width: '48px', height: '48px', margin: '0 auto 12px', fontSize: '26px' }}
        >
          S
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
          Satyam <span>Purchase</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Agri-Procurement & Pricing Management System
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
          <span className="neon-badge">
            <span className="neon-dot"></span>
            Neon Lakebase Postgres & Auth Connected
          </span>
        </div>
      </div>

      <div className="login-card">
        <form onSubmit={handleLoginSubmit} style={{ display: 'grid', gap: '14px' }}>
          <h2>
            Sign In with Password <span className="hi-label">आईडी व पासवर्ड</span>
          </h2>

          <label>
            User ID (Username)
            <input
              type="text"
              placeholder="e.g. admin or officer_dwl"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError('');
              }}
              autoFocus
              required
            />
          </label>

          <label>
            Password
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
              />
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 0,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error && (
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--bad-soft)',
                color: 'var(--bad)',
                borderRadius: '6px',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="btn" disabled={loading || !identifier || !password}>
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>
      </div>

      {/* 1-Click Quick Fill & Demo Credentials */}
      <div className="card">
        <div className="card-header">
          <h2>
            Role Credentials & Demo Logins <span className="hi-label">Tap to fill & sign in</span>
          </h2>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '-6px' }}>
          All 4 roles are configured with dedicated IDs and passwords. Click any profile below to sign in:
        </p>
        <div className="demo-users-list">
          {demoCredentials.map((u) => (
            <button
              key={u.loginId}
              type="button"
              className="demo-user-btn"
              onClick={() => handleQuickFillAndLogin(u)}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{u.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  ID: <code style={{ fontFamily: 'var(--f-num)', color: 'var(--accent)', fontWeight: 600 }}>{u.loginId}</code> · Pass: <code style={{ fontFamily: 'var(--f-num)', color: 'var(--ink)' }}>{u.password}</code>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '2px' }}>
                  {u.desc}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`role-badge ${u.role}`}>{ROLES[u.role] || u.role}</span>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '4px' }}>
                  {centreName(u.centre)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
