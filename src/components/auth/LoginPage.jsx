import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ROLES, centreName } from '../../utils/calculations';

export const LoginPage = () => {
  const { login, users, neonInfo } = useApp();
  const [mobile, setMobile] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [otp, setOtp] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');

  // Fallback demo users if Neon is syncing
  const defaultDemoUsers = [
    { id: 1, name: 'Avi Mangal', mobile: '9000000001', role: 'Admin', centre: 'ALL', active: true, can_cut_comm: true },
    { id: 2, name: 'Rahul (sample)', mobile: '9000000002', role: 'Officer', centre: 'DWL', active: true, can_cut_comm: true },
    { id: 3, name: 'Suresh (sample)', mobile: '9000000003', role: 'Warehouse', centre: 'DWL', active: true, can_cut_comm: false },
    { id: 4, name: 'Accounts (sample)', mobile: '9000000004', role: 'Accounts', centre: 'ALL', active: true, can_cut_comm: false },
    { id: 5, name: 'Sample officer SC2', mobile: '9000000005', role: 'Officer', centre: 'SC2', active: true, can_cut_comm: false },
  ];

  const displayUsers = users && users.length > 0 ? users : defaultDemoUsers;

  const handleSendOtp = (e) => {
    e?.preventDefault();
    const cleanMob = mobile.replace(/\D/g, '');
    const matched = displayUsers.find((u) => u.mobile === cleanMob);

    if (cleanMob.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!matched) {
      setError('This number is not registered. Choose a demo user below or ask Admin to add you.');
      return;
    }
    if (!matched.active) {
      setError('This account is deactivated. Contact Administrator.');
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedCode(code);
    setError('');
    setStep('otp');
  };

  const handleVerifyOtp = (e) => {
    e?.preventDefault();
    if (otp !== generatedCode) {
      setError('Invalid OTP code. Please check and try again.');
      return;
    }
    const cleanMob = mobile.replace(/\D/g, '');
    const matched = displayUsers.find((u) => u.mobile === cleanMob);
    if (matched) {
      login(matched);
    }
  };

  const handleQuickDemoSelect = (u) => {
    setMobile(u.mobile);
    setError('');
    login(u);
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
            Powered by Neon Lakebase Postgres & Auth
          </span>
        </div>
      </div>

      <div className="login-card">
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} style={{ display: 'grid', gap: '14px' }}>
            <h2>
              Sign In <span className="hi-label">लॉगिन करें</span>
            </h2>
            <label>
              Mobile Number
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </label>

            {error && (
              <div style={{ padding: '8px 12px', background: 'var(--bad-soft)', color: 'var(--bad)', borderRadius: '6px', fontSize: '0.88rem' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn" disabled={mobile.length !== 10}>
              Send Verification OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Enter OTP</h2>
              <button
                type="button"
                className="btn sec sm"
                onClick={() => setStep('phone')}
              >
                Change Number
              </button>
            </div>
            <div
              style={{
                padding: '10px 12px',
                background: 'var(--warn-soft)',
                color: 'var(--warn)',
                borderRadius: '6px',
                fontSize: '0.88rem',
              }}
            >
              Prototype Mode: SMS simulated. Your OTP code is:{' '}
              <b style={{ fontFamily: 'var(--f-num)', fontSize: '1.1rem' }}>{generatedCode}</b>
            </div>

            <label>
              6-digit OTP
              <input
                type="text"
                maxLength={6}
                style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.4rem', fontFamily: 'var(--f-num)' }}
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </label>

            {error && (
              <div style={{ padding: '8px 12px', background: 'var(--bad-soft)', color: 'var(--bad)', borderRadius: '6px', fontSize: '0.88rem' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn" disabled={otp.length !== 6}>
              Verify & Enter Portal
            </button>
          </form>
        )}
      </div>

      {/* Quick Demo Logins for fast evaluation */}
      <div className="card">
        <div className="card-header">
          <h2>
            1-Click Demo Logins <span className="hi-label">Tap any role</span>
          </h2>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '-6px' }}>
          Select any user profile below to instantly experience their dedicated RBAC workspace:
        </p>
        <div className="demo-users-list">
          {displayUsers.map((u) => (
            <button
              key={u.id || u.mobile}
              type="button"
              className="demo-user-btn"
              onClick={() => handleQuickDemoSelect(u)}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{u.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Centre: {centreName(u.centre)}
                  {u.can_cut_comm && ' · Can cut commission'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`role-badge ${u.role}`}>{ROLES[u.role] || u.role}</span>
                <div style={{ fontFamily: 'var(--f-num)', fontSize: '0.78rem', color: 'var(--muted)', marginTop: '2px' }}>
                  {u.mobile}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
