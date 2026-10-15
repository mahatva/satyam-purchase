import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  M,
  TODAY,
  YYMMDD,
  ISO,
  calc,
  finalCalc,
  samplePhoto,
  ROLES,
} from '../utils/calculations';

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  // Authentication & RBAC state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('satyam_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState([]);
  const [sodas, setSodas] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [prices, setPrices] = useState([]);
  const [limits, setLimits] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [neonInfo, setNeonInfo] = useState({
    status: 'connecting',
    branch: 'production',
    serverTime: null,
    postgresVersion: null,
  });

  // UI state
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // { type, data }
  const [viewer, setViewer] = useState(null); // { images, index }
  const [activeTab, setActiveTab] = useState({
    Admin: 'approve',
    Officer: 'new',
    Warehouse: 'unload',
    Accounts: 'dash',
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Neon Health & Data
  const refreshData = async () => {
    try {
      // 1. Health & Connection
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const hData = await healthRes.json();
        setNeonInfo({
          status: 'connected',
          branch: hData.branch,
          serverTime: hData.serverTime,
          postgresVersion: hData.postgresVersion,
          authUrl: hData.authUrl,
        });
      }

      // 2. Users
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData);
      }

      // 3. Sodas
      const sodasRes = await fetch('/api/sodas');
      if (sodasRes.ok) {
        const sData = await sodasRes.json();
        setSodas(sData);
      }

      // 4. Dispatches
      const dpRes = await fetch('/api/dispatches');
      if (dpRes.ok) {
        const dpData = await dpRes.json();
        setDispatches(dpData);
      }

      // 5. Prices
      const prRes = await fetch('/api/prices');
      if (prRes.ok) {
        const prData = await prRes.json();
        setPrices(prData);
      }

      // 6. Limits
      const limRes = await fetch('/api/limits');
      if (limRes.ok) {
        const limData = await limRes.json();
        const map = {};
        limData.forEach((item) => {
          map[item.key] = Number(item.limit_qty);
        });
        setLimits((prev) => ({ ...prev, ...map }));
      }

      // 7. Activity
      const actRes = await fetch('/api/activity');
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivityLogs(actData);
      }
    } catch (err) {
      console.warn('API sync notice (falling back gracefully):', err);
      setNeonInfo((prev) => ({ ...prev, status: 'fallback' }));
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Save active user in localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('satyam_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('satyam_user');
    }
  }, [user]);

  // Auth operations
  const login = async (userId, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      if (res.ok) {
        const authedUser = await res.json();
        setUser(authedUser);
        logAudit(`Logged in as ${authedUser.name} (${authedUser.role})`);
        showToast(`Welcome back, ${authedUser.name}`, 'ok');
        return { success: true, user: authedUser };
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || 'Invalid credentials';
        showToast(msg, 'bad');
        return { success: false, error: msg };
      }
    } catch (e) {
      const cleanId = String(userId).trim().toLowerCase();
      const matched = users.find(
        (u) => u.login_id?.toLowerCase() === cleanId && u.password === password
      );
      if (matched) {
        setUser(matched);
        showToast(`Welcome back, ${matched.name}`, 'ok');
        return { success: true, user: matched };
      }
      showToast('Invalid User ID or Password', 'bad');
      return { success: false, error: 'Invalid User ID or Password' };
    }
  };

  const logout = () => {
    if (user) logAudit(`User ${user.name} logged out`);
    localStorage.removeItem('satyam_user');
    setUser(null);
    showToast('Logged out successfully', 'info');
  };

  const switchRole = async (newRole, password = null) => {
    if (!user) return;

    // Rule: Don't allow switching without password EXCEPT for Admin
    if (user.role === 'Admin') {
      // Admin can freely switch without any password prompt!
      const targetUser = users.find((u) => u.role === newRole && u.active) || {
        ...user,
        role: newRole,
        centre: newRole === 'Admin' || newRole === 'Accounts' ? 'ALL' : 'DWL',
      };
      setUser(targetUser);
      logAudit(`Admin switched view to ${newRole}`);
      showToast(`Switched active view to ${ROLES[newRole] || newRole}`, 'info');
      return { success: true };
    }

    // Non-Admin: MUST provide password for target role
    if (!password) {
      // Open Password Prompt Modal
      setModal({ type: 'role-switch', targetRole: newRole });
      return { requiresPassword: true };
    }

    try {
      const res = await fetch('/api/auth/verify-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole: newRole, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const authedUser = data.user || users.find((u) => u.role === newRole && u.active);
        setUser(authedUser);
        logAudit(`Role switched to ${newRole} after password authentication`);
        showToast(`Authenticated & switched to ${ROLES[newRole] || newRole}`, 'ok');
        setModal(null);
        return { success: true };
      } else {
        showToast('Access Denied: Incorrect password for this role', 'bad');
        return { success: false, error: 'Incorrect password' };
      }
    } catch (e) {
      const matched = users.find(
        (u) => (u.role === newRole || u.role === 'Admin') && u.password === password && u.active
      );
      if (matched) {
        setUser(matched);
        showToast(`Authenticated & switched to ${ROLES[newRole] || newRole}`, 'ok');
        setModal(null);
        return { success: true };
      }
      showToast('Access Denied: Incorrect password', 'bad');
      return { success: false, error: 'Incorrect password' };
    }
  };

  const logAudit = async (action) => {
    const userLabel = user ? `${user.name} · ${user.role}` : 'System';
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_label: userLabel, action }),
      });
      refreshData();
    } catch (e) {
      setActivityLogs((prev) => [
        { id: Date.now(), user_label: userLabel, action, created_at: new Date().toISOString() },
        ...prev,
      ]);
    }
  };

  // Business actions
  const createSoda = async (sodaData) => {
    try {
      const res = await fetch('/api/sodas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sodaData),
      });
      if (res.ok) {
        const created = await res.json();
        setSodas((prev) => [created, ...prev]);
        logAudit(`Created soda ${created.id} (${created.commodity} ${created.grade}, ${created.approx_qty} qtl)`);
        showToast(`Soda ${created.id} created successfully!`, 'ok');
        return created;
      }
    } catch (e) {
      setSodas((prev) => [sodaData, ...prev]);
      showToast(`Soda ${sodaData.id} saved`, 'ok');
      return sodaData;
    }
  };

  const approveSoda = async (id) => {
    try {
      const s = sodas.find((x) => x.id === id);
      const history = [...(s?.history || []), { at: new Date().toISOString(), u: `${user?.name} · Admin`, a: 'Approved over-ceiling/quota by Admin' }];
      await fetch(`/api/sodas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Confirmed', history }),
      });
      logAudit(`Admin approved soda ${id}`);
      showToast(`Soda ${id} approved`, 'ok');
      refreshData();
    } catch (e) {
      setSodas((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'Confirmed' } : s)));
      showToast(`Approved ${id}`, 'ok');
    }
  };

  const cancelSoda = async (id, reason) => {
    try {
      const s = sodas.find((x) => x.id === id);
      const history = [...(s?.history || []), { at: new Date().toISOString(), u: `${user?.name} · Admin`, a: `Cancelled · ${reason}` }];
      await fetch(`/api/sodas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled', cancellation_reason: reason, history }),
      });
      logAudit(`Cancelled soda ${id}: ${reason}`);
      showToast(`Soda ${id} cancelled`, 'bad');
      refreshData();
    } catch (e) {
      setSodas((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'Cancelled' } : s)));
      showToast(`Cancelled ${id}`, 'bad');
    }
  };

  const unloadSoda = async (id, unloadData) => {
    try {
      const s = sodas.find((x) => x.id === id);
      const history = [
        ...(s?.history || []),
        {
          at: new Date().toISOString(),
          u: `${user?.name} · Warehouse`,
          a: `Unloaded · net ${unloadData.net_weight} qtl, moisture ${unloadData.final_moisture}%`,
        },
      ];
      await fetch(`/api/sodas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...unloadData,
          status: 'Unloaded',
          history,
        }),
      });
      logAudit(`Warehouse unloaded ${id}: net ${unloadData.net_weight} qtl`);
      showToast(`Unload recorded for ${id} · sent for final approval`, 'ok');
      refreshData();
    } catch (e) {
      setSodas((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...unloadData, status: 'Unloaded' } : s))
      );
      showToast(`Unloaded ${id}`, 'ok');
    }
  };

  const approveFinalRate = async (id, finalRate, amount) => {
    try {
      const s = sodas.find((x) => x.id === id);
      const history = [
        ...(s?.history || []),
        {
          at: new Date().toISOString(),
          u: `${user?.name} · Admin`,
          a: `Final rate approved @ ₹${finalRate}`,
        },
      ];
      await fetch(`/api/sodas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          final_rate: finalRate,
          amount: amount,
          status: 'FinalApproved',
          history,
        }),
      });
      logAudit(`Final approved ${id} @ ₹${finalRate} (Total: ₹${amount.toLocaleString('en-IN')})`);
      showToast(`Final rate approved for ${id}`, 'ok');
      refreshData();
    } catch (e) {
      setSodas((prev) =>
        prev.map((s) => (s.id === id ? { ...s, final_rate: finalRate, amount, status: 'FinalApproved' } : s))
      );
      showToast(`Final approved ${id}`, 'ok');
    }
  };

  const createDispatch = async (dpData) => {
    try {
      const res = await fetch('/api/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dpData),
      });
      if (res.ok) {
        const created = await res.json();
        setDispatches((prev) => [created, ...prev]);
        logAudit(`Recorded dispatch of ${dpData.qty} qtl on ${dpData.vehicle_no}`);
        showToast('Dispatch saved successfully', 'ok');
        return created;
      }
    } catch (e) {
      setDispatches((prev) => [dpData, ...prev]);
      showToast('Dispatch saved', 'ok');
      return dpData;
    }
  };

  const publishPrice = async (commodity, grade, price) => {
    try {
      const effective_at = new Date().toISOString().slice(0, 16).replace('T', ' ');
      await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commodity, grade, price, effective_at }),
      });
      logAudit(`Published new price for ${commodity} ${grade}: ₹${price}/qtl`);
      showToast(`Published ${commodity} Grade ${grade}: ₹${price}`, 'ok');
      refreshData();
    } catch (e) {
      showToast('Price updated locally', 'info');
    }
  };

  const setLimit = async (key, centre, commodity, date_iso, limit_qty) => {
    try {
      await fetch('/api/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, centre, commodity, date_iso, limit_qty }),
      });
      setLimits((prev) => ({ ...prev, [key]: limit_qty }));
      showToast(`Limit updated for ${centre} ${commodity}`, 'info');
    } catch (e) {
      setLimits((prev) => ({ ...prev, [key]: limit_qty }));
    }
  };

  const saveUser = async (userData) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (res.ok) {
        logAudit(`Saved user ${userData.name} (${userData.role})`);
        showToast(userData.id ? 'User updated' : 'User created', 'ok');
        refreshData();
      }
    } catch (e) {
      showToast('User saved', 'ok');
    }
  };

  const toggleUser = async (id, currentActive) => {
    try {
      await fetch(`/api/users/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });
      logAudit(`Toggled user status for ID ${id} to ${!currentActive ? 'active' : 'inactive'}`);
      showToast(!currentActive ? 'User reactivated' : 'User deactivated', 'info');
      refreshData();
    } catch (e) {
      showToast('User status updated', 'info');
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        role: user?.role || 'Guest',
        centre: user?.centre || 'DWL',
        users,
        sodas,
        dispatches,
        prices,
        limits,
        activityLogs,
        neonInfo,
        toast,
        modal,
        viewer,
        activeTab,
        setActiveTab,
        setModal,
        setViewer,
        showToast,
        login,
        logout,
        switchRole,
        createSoda,
        approveSoda,
        cancelSoda,
        unloadSoda,
        approveFinalRate,
        createDispatch,
        publishPrice,
        setLimit,
        saveUser,
        toggleUser,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
