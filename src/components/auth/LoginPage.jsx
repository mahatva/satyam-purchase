import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const LoginPage = () => {
  const { login } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    </div>
  );
};
