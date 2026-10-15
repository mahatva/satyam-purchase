import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  M,
  DAYS,
  calc,
  finalCalc,
  limitFor,
  booked,
  r0,
  inr,
  q,
  centreName,
  ROLES,
} from '../../utils/calculations';

export const AdminPortal = () => {
  const {
    sodas,
    users,
    prices,
    limits,
    activityLogs,
    approveSoda,
    cancelSoda,
    approveFinalRate,
    publishPrice,
    setLimit,
    setModal,
    showToast,
  } = useApp();

  const [tab, setTab] = useState('approve'); // 'approve' | 'users' | 'limits' | 'prices' | 'ledger' | 'calc' | 'log'
  const [limCommodity, setLimCommodity] = useState('Maize');
  const [newPrices, setNewPrices] = useState({});
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatus, setLedgerStatus] = useState('ALL');

  // Breakdown Simulator State
  const [simCentre, setSimCentre] = useState('DWL');
  const [simCommodity, setSimCommodity] = useState('Maize');
  const [simGrade, setSimGrade] = useState('A');
  const [simMoisture, setSimMoisture] = useState('14');

  // Pending Approvals
  const pendingApprovals = (sodas || []).filter((s) => s.status === 'PendingApproval');
  const pendingFinalRates = (sodas || []).filter((s) => s.status === 'Unloaded');

  // Decision History
  const pastDecisions = (sodas || []).filter(
    (s) => s.status === 'FinalApproved' || s.status === 'Cancelled' || (s.history || []).some((h) => /approved/i.test(h.a))
  );

  // Publish Prices
  const handlePublishPrices = async () => {
    const entries = Object.entries(newPrices).filter(([_, val]) => parseFloat(val) > 0);
    if (entries.length === 0) {
      showToast('Enter at least one valid price to publish', 'warn');
      return;
    }

    for (const [key, val] of entries) {
      const [c, g] = key.split('|');
      await publishPrice(c, g, parseFloat(val));
    }
    setNewPrices({});
  };

  // Update Daily Limit in Matrix
  const handleLimitChange = (centreCode, c, dateIso, val) => {
    const key = `${centreCode}|${c}|${dateIso}`;
    setLimit(key, centreCode, c, dateIso, val === '' ? null : parseFloat(val));
  };

  const simCalc = calc(simCentre, simCommodity, simGrade, parseFloat(simMoisture) || 0, null, prices);

  const filteredLedger = (sodas || []).filter((s) => {
    const matchStatus = ledgerStatus === 'ALL' || s.status === ledgerStatus;
    const matchSearch = `${s.id} ${s.farmer_name || s.farmer} ${s.village} ${s.centre}`.toLowerCase().includes(ledgerSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <div className="tabs-nav">
        <button
          className={`tab-btn ${tab === 'approve' ? 'active' : ''}`}
          onClick={() => setTab('approve')}
        >
          Approvals Queue ({pendingApprovals.length + pendingFinalRates.length})
        </button>
        <button
          className={`tab-btn ${tab === 'ledger' ? 'active' : ''}`}
          onClick={() => setTab('ledger')}
        >
          Procurement Ledger
        </button>
        <button
          className={`tab-btn ${tab === 'users' ? 'active' : ''}`}
          onClick={() => setTab('users')}
        >
          User RBAC Manager ({users.length})
        </button>
        <button
          className={`tab-btn ${tab === 'limits' ? 'active' : ''}`}
          onClick={() => setTab('limits')}
        >
          Daily Quotas Matrix
        </button>
        <button
          className={`tab-btn ${tab === 'prices' ? 'active' : ''}`}
          onClick={() => setTab('prices')}
        >
          Plant Prices & Masters
        </button>
        <button
          className={`tab-btn ${tab === 'calc' ? 'active' : ''}`}
          onClick={() => setTab('calc')}
        >
          Ceiling Breakdown Simulator
        </button>
        <button
          className={`tab-btn ${tab === 'log' ? 'active' : ''}`}
          onClick={() => setTab('log')}
        >
          Audit Log
        </button>
      </div>

      {tab === 'approve' ? (
        /* Approvals Queue */
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* 1. Over-ceiling & Over-quota sodas */}
          <div className="card">
            <div className="card-header">
              <h2>
                Pending Deal Approvals (Over-Ceiling / Quota){' '}
                <span className="hi-label">{pendingApprovals.length}</span>
              </h2>
            </div>

            <div className="items-list">
              {pendingApprovals.length === 0 ? (
                <p style={{ color: 'var(--muted)', padding: '12px 0' }}>
                  No deals awaiting authorization. All booked sodas are within limits.
                </p>
              ) : (
                pendingApprovals.map((s) => {
                  const agreed = s.rate_snapshot?.agreed || s.snap?.agreed || 0;
                  const ceil = s.rate_snapshot?.ceiling || s.snap?.ceiling || 0;
                  const overCeil = agreed - ceil;
                  const reasons = s.reasons || (overCeil > 0 ? ['ceiling'] : []);

                  return (
                    <div key={s.id} className="list-item-card" style={{ borderLeft: '4px solid var(--bad)' }}>
                      <div className="item-top">
                        <span className="item-id">{s.id}</span>
                        <span className="status-pill st-PendingApproval">Pending Authorization</span>
                      </div>

                      <div>
                        <b>{s.farmer_name || s.farmer}</b> ({s.village || '—'}) · {s.commodity || s.c} Grade {s.grade || s.g} ·{' '}
                        <b>{centreName(s.centre)}</b>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span>Approx: <b>{q(s.approx_qty || s.qty)} qtl</b></span>
                        <span>Offered Rate: <b style={{ color: 'var(--bad)' }}>{inr(agreed)}/qtl</b> (Ceiling: {inr(ceil)})</span>
                      </div>

                      {/* Reasons */}
                      <div style={{ display: 'grid', gap: '4px' }}>
                        {reasons.map((r, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '6px 10px',
                              background: 'var(--warn-soft)',
                              color: 'var(--warn)',
                              borderRadius: '4px',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                            }}
                          >
                            {r === 'ceiling'
                              ? `⚠️ Exceeds ceiling price by ${inr(overCeil)}/qtl`
                              : `⚠️ Exceeds today's daily centre procurement quota`}
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => approveSoda(s.id)}
                        >
                          Approve Deal
                        </button>
                        <button
                          type="button"
                          className="btn bad sm"
                          onClick={() => cancelSoda(s.id, 'Price or quota rejected by Admin')}
                        >
                          Reject & Cancel
                        </button>
                        <button
                          type="button"
                          className="btn sec sm"
                          onClick={() => setModal({ type: 'soda', data: s })}
                        >
                          View Full Details & Photos ›
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Final Rate Payout Approvals for Unloaded Lots */}
          <div className="card">
            <div className="card-header">
              <h2>
                Final Settlement Rate Approvals (Unloaded Lots){' '}
                <span className="hi-label">{pendingFinalRates.length}</span>
              </h2>
            </div>

            <div className="items-list">
              {pendingFinalRates.length === 0 ? (
                <p style={{ color: 'var(--muted)', padding: '12px 0' }}>
                  No unloaded lots awaiting final rate authorization.
                </p>
              ) : (
                pendingFinalRates.map((s) => {
                  const fc = finalCalc(s, s.final_moisture || s.fm || 14, s.net_weight || s.net || 0);

                  return (
                    <div key={s.id} className="list-item-card" style={{ borderLeft: '4px solid var(--warn)' }}>
                      <div className="item-top">
                        <span className="item-id">{s.id}</span>
                        <span className="status-pill st-Unloaded">Unloaded · Awaiting Final Rate</span>
                      </div>

                      <div>
                        <b>{s.farmer_name || s.farmer}</b> · {s.commodity || s.c} Grade {s.grade || s.g} ·{' '}
                        <b>{centreName(s.centre)}</b>
                      </div>

                      <dl className="kv-list" style={{ background: 'var(--surface-alt)', padding: '10px', borderRadius: '6px' }}>
                        <dt>Agreed Deal Rate</dt>
                        <dd>{inr(s.rate_snapshot?.agreed || s.snap?.agreed)}</dd>
                        <dt>Net Weighbridge Weight</dt>
                        <dd>{q(s.net_weight || s.net)} qtl</dd>
                        <dt>Final Moisture Tested</dt>
                        <dd>{s.final_moisture || s.fm}% (Soda: {s.rate_snapshot?.moistEntered || 14}%)</dd>
                        <dt className="total">Calculated Payout Rate · Total</dt>
                        <dd className="total" style={{ color: 'var(--accent)' }}>
                          {inr(fc.rate)}/qtl · <b>{inr(fc.amount)}</b>
                        </dd>
                      </dl>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => approveFinalRate(s.id, fc.rate, fc.amount)}
                        >
                          Approve Final Rate @ {inr(fc.rate)} ({inr(fc.amount)})
                        </button>
                        <button
                          type="button"
                          className="btn sec sm"
                          onClick={() => setModal({ type: 'soda', data: s })}
                        >
                          Inspect Weighment Slip & Photos ›
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Past Decisions Log */}
          <div className="card">
            <h2>Recent Authorization Decisions</h2>
            <div className="items-list">
              {pastDecisions.slice(0, 5).map((s) => (
                <div key={s.id} className="list-item-card">
                  <div className="item-top">
                    <span className="item-id">{s.id}</span>
                    <span className={`status-pill st-${s.status}`}>{s.status}</span>
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
                    {s.farmer_name || s.farmer} · {s.commodity || s.c} {s.grade || s.g} ·{' '}
                    {s.final_rate ? `Approved Rate: ${inr(s.final_rate)} (Payout: ${inr(s.amount)})` : inr(s.rate_snapshot?.agreed)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : tab === 'ledger' ? (
        /* Procurement Ledger */
        <div className="card">
          <div className="card-header">
            <h2>Master Procurement Ledger</h2>
          </div>
          <div className="grid-row-2">
            <input
              type="text"
              placeholder="Search by ID, farmer, centre, village..."
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
            />
            <select
              value={ledgerStatus}
              onChange={(e) => setLedgerStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="PendingApproval">Pending Approval</option>
              <option value="Unloaded">Unloaded</option>
              <option value="FinalApproved">Final Approved</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Soda ID</th>
                  <th>Centre</th>
                  <th>Status</th>
                  <th>Farmer</th>
                  <th>Commodity</th>
                  <th className="num-cell">Qty</th>
                  <th className="num-cell">Agreed</th>
                  <th className="num-cell">Final Rate</th>
                  <th className="num-cell">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((s) => (
                  <tr
                    key={s.id}
                    className="clickable-row"
                    onClick={() => setModal({ type: 'soda', data: s })}
                  >
                    <td style={{ fontFamily: 'var(--f-num)', fontWeight: 700 }}>{s.id}</td>
                    <td>{s.centre}</td>
                    <td><span className={`status-pill st-${s.status}`}>{s.status}</span></td>
                    <td><b>{s.farmer_name || s.farmer}</b></td>
                    <td>{s.commodity || s.c} {s.grade || s.g}</td>
                    <td className="num-cell">{q(s.net_weight || s.approx_qty || s.qty)} qtl</td>
                    <td className="num-cell">{inr(s.rate_snapshot?.agreed || s.snap?.agreed)}</td>
                    <td className="num-cell">{s.final_rate ? inr(s.final_rate) : '—'}</td>
                    <td className="num-cell" style={{ fontWeight: 700 }}>
                      {s.amount ? inr(s.amount) : inr((s.rate_snapshot?.agreed || 0) * (s.approx_qty || s.qty || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'users' ? (
        /* User & RBAC Manager */
        <div className="card">
          <div className="card-header">
            <h2>
              System Users & RBAC Permissions <span className="hi-label">{users.filter((u) => u.active).length} Active</span>
            </h2>
            <button
              type="button"
              className="btn sm"
              onClick={() => setModal({ type: 'user', data: null })}
            >
              + Add New User
            </button>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {Object.keys(ROLES).map((roleKey) => {
              const roleUsers = users.filter((u) => u.role === roleKey);
              if (roleUsers.length === 0) return null;
              return (
                <div key={roleKey} style={{ display: 'grid', gap: '6px' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    {ROLES[roleKey]}
                  </div>
                  {roleUsers.map((u) => (
                    <div
                      key={u.id}
                      className="list-item-card"
                      style={{ opacity: u.active ? 1 : 0.6 }}
                    >
                      <div className="item-top">
                        <div>
                          <b>{u.name}</b> · User ID: <code style={{ fontFamily: 'var(--f-num)', color: 'var(--accent)', fontWeight: 700 }}>{u.login_id}</code> · Password: <code style={{ fontFamily: 'var(--f-num)', color: 'var(--ink)' }}>{u.password || '••••••'}</code>{u.mobile && u.mobile !== '—' ? <span style={{ fontFamily: 'var(--f-num)', color: 'var(--muted)', marginLeft: '6px' }}>(Contact: {u.mobile})</span> : null}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className={`role-badge ${u.role}`}>{centreName(u.centre)}</span>
                          {!u.active && <span className="status-pill st-Cancelled">Deactivated</span>}
                          <button
                            type="button"
                            className="btn sec sm"
                            onClick={() => setModal({ type: 'user', data: u })}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        {u.role === 'Officer'
                          ? u.can_cut_comm
                            ? '✓ Authorized to reduce commission for farmers'
                            : 'Standard commission only'
                          : 'Full access to assigned role workspace'}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : tab === 'limits' ? (
        /* Daily Quotas Matrix */
        <div className="card">
          <div className="card-header">
            <h2>Daily Procurement Quota Matrix (Quintals) <span className="hi-label">रोज़ की सीमा</span></h2>
          </div>

          <label>
            Select Commodity
            <select
              value={limCommodity}
              onChange={(e) => setLimCommodity(e.target.value)}
            >
              {Object.keys(M.commodities).map((c) => (
                <option key={c} value={c}>
                  {c} · {M.commodities[c]}
                </option>
              ))}
            </select>
          </label>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Centre</th>
                  {DAYS.map((d) => (
                    <th key={d.iso} className="num-cell">{d.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {M.centres.map((ce) => (
                  <tr key={ce.code}>
                    <td>
                      <b>{ce.code}</b> · {ce.name}
                    </td>
                    {DAYS.map((d, i) => {
                      const curVal = limitFor(limits, ce.code, limCommodity, d.iso);
                      const bk = booked(sodas, ce.code, limCommodity, d.iso);
                      return (
                        <td key={d.iso} className="num-cell">
                          <input
                            type="number"
                            style={{ width: '90px', padding: '6px 8px', textAlign: 'right' }}
                            placeholder="No limit"
                            defaultValue={curVal ?? ''}
                            onBlur={(e) => handleLimitChange(ce.code, limCommodity, d.iso, e.target.value)}
                          />
                          {i === 0 && (
                            <div style={{ fontSize: '0.74rem', color: curVal != null && bk.qty > curVal ? 'var(--bad)' : 'var(--muted)', marginTop: '2px' }}>
                              Booked: <b>{q(bk.qty)}</b>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            Quotas update live in Neon Postgres. When an officer books a soda exceeding the quota, it requires Admin authorization.
          </p>
        </div>
      ) : tab === 'prices' ? (
        /* Plant Prices & Masters */
        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <h2>Publish Plant Delivered Prices (₹/qtl)</h2>
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th>Grade</th>
                    <th className="num-cell">Current Price</th>
                    <th>New Price (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {['Maize', 'Chickpea'].flatMap((c) =>
                    ['A', 'B', 'C'].map((g) => {
                      const key = `${c}|${g}`;
                      const match = prices.find((p) => (p.commodity || p.c) === c && (p.grade || p.g) === g);
                      const currentVal = match ? match.price || match.v : 2400;

                      return (
                        <tr key={key}>
                          <td><b>{c}</b></td>
                          <td>Grade {g}</td>
                          <td className="num-cell" style={{ fontWeight: 700 }}>{inr(currentVal)}</td>
                          <td>
                            <input
                              type="number"
                              style={{ width: '120px', padding: '6px 10px' }}
                              placeholder="New rate"
                              value={newPrices[key] || ''}
                              onChange={(e) => setNewPrices({ ...newPrices, [key]: e.target.value })}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn" onClick={handlePublishPrices}>
              Publish New Prices to Neon Database
            </button>
          </div>

          {/* Moisture Standard Rules */}
          <div className="card">
            <h2>Commodity Moisture Policies</h2>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th className="num-cell">Base Standard</th>
                    <th className="num-cell">Penalty / 1% Excess</th>
                    <th className="num-cell">Maximum Allowed (Hard Block)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(M.moisture).map(([c, r]) => (
                    <tr key={c}>
                      <td><b>{c}</b></td>
                      <td className="num-cell">{r.base}%</td>
                      <td className="num-cell">{r.dedType === 'wt' ? `${r.ded}% by weight` : `₹${r.ded}/qtl`}</td>
                      <td className="num-cell" style={{ color: 'var(--bad)', fontWeight: 700 }}>{r.max}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : tab === 'calc' ? (
        /* Ceiling Simulator */
        <div className="card">
          <div className="card-header">
            <h2>Ceiling Rate Simulator (Admin Engine)</h2>
          </div>
          <div className="grid-row-2">
            <label>
              Centre
              <select value={simCentre} onChange={(e) => setSimCentre(e.target.value)}>
                {M.centres.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Commodity
              <select value={simCommodity} onChange={(e) => setSimCommodity(e.target.value)}>
                {Object.keys(M.commodities).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid-row-2">
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>Grade</div>
              <div className="seg-control">
                {['A', 'B', 'C'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`seg-btn ${simGrade === g ? 'active' : ''}`}
                    onClick={() => setSimGrade(g)}
                  >
                    Grade {g}
                  </button>
                ))}
              </div>
            </div>

            <label>
              Moisture %
              <input
                type="number"
                step="0.1"
                value={simMoisture}
                onChange={(e) => setSimMoisture(e.target.value)}
              />
            </label>
          </div>

          <div className="ceiling-box">
            <span className="label">Computed Ceiling Buying Rate</span>
            <div className="big-rate">{inr(simCalc.ceiling)}/qtl</div>
            <span style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
              Plant: {inr(simCalc.plant)} · Target Landed: {inr(simCalc.T)} · Base Ceiling: {inr(simCalc.P)} · Deduction: {inr(simCalc.mDed)}
            </span>
          </div>
        </div>
      ) : (
        /* Activity Logs */
        <div className="card">
          <h2>System Activity & Audit Log (Neon Postgres)</h2>
          <div className="items-list">
            {(activityLogs || []).map((l, i) => (
              <div key={l.id || i} className="list-item-card">
                <div className="item-top">
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{l.user_label || l.u}</span>
                  <span style={{ fontFamily: 'var(--f-num)', fontSize: '0.78rem', color: 'var(--muted)' }}>
                    {l.created_at ? new Date(l.created_at).toLocaleString('en-IN') : l.at}
                  </span>
                </div>
                <div style={{ fontSize: '0.88rem' }}>{l.action || l.a}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
