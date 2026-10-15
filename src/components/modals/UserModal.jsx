import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { M, ROLES } from '../../utils/calculations';

export const UserModal = ({ userData, onClose }) => {
  const { user: currentUser, saveUser, toggleUser, showToast } = useApp();

  const isEdit = !!userData;
  const isSelf = currentUser && userData && currentUser.id === userData.id;

  const [name, setName] = useState(userData?.name || '');
  const [mobile, setMobile] = useState(userData?.mobile || '');
  const [loginId, setLoginId] = useState(userData?.login_id || '');
  const [password, setPassword] = useState(userData?.password || 'user123');
  const [userRole, setUserRole] = useState(userData?.role || 'Officer');
  const [centre, setCentre] = useState(userData?.centre || 'DWL');
  const [canCutComm, setCanCutComm] = useState(userData?.can_cut_comm || false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter full name', 'warn');
      return;
    }
    const cleanLoginId = loginId.trim().toLowerCase();
    if (!cleanLoginId) {
      showToast('Please enter a User Login ID', 'warn');
      return;
    }
    if (!password) {
      showToast('Please set an account password', 'warn');
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, '');

    const payload = {
      id: userData?.id,
      name: name.trim(),
      mobile: cleanMobile || '—',
      login_id: cleanLoginId,
      password: password || 'user123',
      role: userRole,
      centre: userRole === 'Admin' || userRole === 'Accounts' ? 'ALL' : centre,
      can_cut_comm: userRole === 'Officer' ? canCutComm : false,
      active: userData ? userData.active : true,
    };

    await saveUser(payload);
    onClose();
  };

  const handleToggleActive = async () => {
    if (userData) {
      await toggleUser(userData.id, userData.active);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
            {isEdit ? 'Edit System User' : 'Add New System User'}
          </h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <label>
            Full Name
            <input
              type="text"
              placeholder="e.g. Ramesh Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <div className="grid-row-2">
            <label>
              User Login ID (Username)
              <input
                type="text"
                placeholder="e.g. officer_kesur"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
              />
            </label>

            <label>
              Account Password
              <input
                type="text"
                placeholder="Set password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          </div>

          <label>
            Mobile Number (Optional contact)
            <input
              type="tel"
              maxLength={10}
              placeholder="10-digit mobile number (optional)"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
            />
          </label>

          <label>
            System Role
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              disabled={isSelf}
            >
              {Object.entries(ROLES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {userRole !== 'Admin' && userRole !== 'Accounts' && (
            <label>
              Assigned Procurement Centre
              <select
                value={centre}
                onChange={(e) => setCentre(e.target.value)}
              >
                {M.centres.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {userRole === 'Officer' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '6px' }}>
              <input
                type="checkbox"
                style={{ width: '20px', height: '20px' }}
                checked={canCutComm}
                onChange={(e) => setCanCutComm(e.target.checked)}
              />
              <span>Field officer is authorized to reduce commission for farmers</span>
            </label>
          )}

          <button type="submit" className="btn" style={{ marginTop: '8px' }}>
            {isEdit ? 'Save Changes' : 'Create User in Neon Database'}
          </button>

          {isEdit && !isSelf && (
            <button
              type="button"
              className={`btn ${userData.active ? 'bad' : 'sec'}`}
              onClick={handleToggleActive}
            >
              {userData.active ? 'Deactivate User (Block Login)' : 'Reactivate User Account'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
