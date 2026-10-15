import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ROLES } from '../../utils/calculations';

export const RoleSwitchModal = ({ targetRole, onClose }) => {
  const { switchRole } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter the password');
      return;
    }

    setLoading(true);
    setError('');
    const res = await switchRole(targetRole, password);
    setLoading(false);

    if (res.error) {
      setError(res.error || 'Incorrect password for this role');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>🔒</span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Role Switch Security</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
            Switching to <b>{ROLES[targetRole] || targetRole}</b> requires authorization. Only Admins can switch views freely without password confirmation.
          </p>

          <label>
            Enter Password for {targetRole} (or Admin Master Password)
            <input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              autoFocus
              required
            />
          </label>

          {error && (
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--bad-soft)',
                color: 'var(--bad)',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button
              type="submit"
              className="btn"
              style={{ flex: 1 }}
              disabled={loading || !password}
            >
              {loading ? 'Authenticating...' : `Authorize & Switch to ${targetRole}`}
            </button>
            <button
              type="button"
              className="btn sec"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
