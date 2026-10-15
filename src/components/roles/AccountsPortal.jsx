import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  M,
  stock,
  r0,
  inr,
  q,
  centreName,
} from '../../utils/calculations';

export const AccountsPortal = () => {
  const { sodas, dispatches, setModal, showToast } = useApp();
  const [tab, setTab] = useState('dash'); // 'dash' | 'ledger' | 'freight'
  const [selectedCentre, setSelectedCentre] = useState('ALL');
  const [selectedCommodity, setSelectedCommodity] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Filtered Sodas
  const filteredSodas = (sodas || []).filter((s) => {
    const matchCentre = selectedCentre === 'ALL' || s.centre === selectedCentre;
    const matchComm = selectedCommodity === 'ALL' || (s.commodity || s.c) === selectedCommodity;
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchSearch = `${s.id} ${s.farmer_name || s.farmer} ${s.village}`.toLowerCase().includes(search.toLowerCase());
    return matchCentre && matchComm && matchStatus && matchSearch;
  });

  // KPIs
  const totalStock = stock(sodas, dispatches, selectedCentre);
  const totalApprovedSpend = (sodas || [])
    .filter((s) => (selectedCentre === 'ALL' || s.centre === selectedCentre) && s.status === 'FinalApproved')
    .reduce((sum, s) => sum + (Number(s.amount) || (Number(s.final_rate) * Number(s.net_weight)) || 0), 0);

  const pendingUnloadedLots = (sodas || []).filter(
    (s) => (selectedCentre === 'ALL' || s.centre === selectedCentre) && s.status === 'Unloaded'
  );

  const pendingLiability = pendingUnloadedLots.reduce(
    (sum, s) => sum + (Number(s.amount) || ((s.rate_snapshot?.agreed || 0) * (Number(s.net_weight) || 0))),
    0
  );

  const centreDispatches = (dispatches || []).filter(
    (d) => selectedCentre === 'ALL' || d.centre === selectedCentre
  );
  const totalEstFreight = centreDispatches.reduce((sum, d) => sum + (Number(d.est_freight || d.est) || 0), 0);
  const totalActFreight = centreDispatches.reduce((sum, d) => sum + (Number(d.actual_freight || d.actual) || 0), 0);

  // CSV Export for Excel / Accounting
  const handleCopyCSV = () => {
    const rows = [
      ['Soda ID', 'Centre', 'Status', 'Commodity', 'Grade', 'Farmer', 'Village', 'Agreed Rate', 'Net Weight (qtl)', 'Final Rate', 'Total Amount (Rs)', 'Date'],
      ...filteredSodas.map((s) => [
        s.id,
        s.centre,
        s.status,
        s.commodity || s.c,
        s.grade || s.g,
        s.farmer_name || s.farmer,
        s.village || '—',
        s.rate_snapshot?.agreed || s.snap?.agreed || '',
        s.net_weight || s.approx_qty || '',
        s.final_rate || '',
        s.amount || '',
        s.date_iso || s.at || '',
      ]),
    ];

    const csvContent = rows.map((e) => e.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    navigator.clipboard?.writeText(csvContent);
    showToast('Procurement ledger copied to clipboard as CSV (ready to paste in Excel)', 'ok');
  };

  return (
    <div>
      <div className="tabs-nav">
        <button
          className={`tab-btn ${tab === 'dash' ? 'active' : ''}`}
          onClick={() => setTab('dash')}
        >
          Financial Dashboard
        </button>
        <button
          className={`tab-btn ${tab === 'ledger' ? 'active' : ''}`}
          onClick={() => setTab('ledger')}
        >
          Procurement Ledger ({filteredSodas.length})
        </button>
        <button
          className={`tab-btn ${tab === 'freight' ? 'active' : ''}`}
          onClick={() => setTab('freight')}
        >
          Freight & Logistics Audit
        </button>
      </div>

      {/* Scope Selector */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="grid-row-2">
          <label>
            Procurement Centre Scope
            <select
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
            >
              <option value="ALL">All Procurement Centres (Consolidated)</option>
              {M.centres.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Commodity
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
            >
              <option value="ALL">All Commodities</option>
              {Object.keys(M.commodities).map((c) => (
                <option key={c} value={c}>
                  {c} · {M.commodities[c]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {tab === 'dash' ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Key Financial KPIs */}
          <div className="kpis-grid">
            <div className="kpi-card">
              <span className="lbl">Approved Spend</span>
              <div className="val" style={{ color: 'var(--ok)' }}>{inr(totalApprovedSpend)}</div>
              <span className="sub">Fully settled & verified lots</span>
            </div>

            <div className="kpi-card">
              <span className="lbl">Pending Liability</span>
              <div className="val" style={{ color: 'var(--warn)' }}>{inr(pendingLiability)}</div>
              <span className="sub">{pendingUnloadedLots.length} unloaded lots awaiting final rate</span>
            </div>

            <div className="kpi-card">
              <span className="lbl">Current Stock in Hand</span>
              <div className="val">{q(totalStock.stock)} qtl</div>
              <span className="sub">Unloaded: {q(totalStock.un)} qtl · Dispatched: {q(totalStock.dp)} qtl</span>
            </div>

            <div className="kpi-card">
              <span className="lbl">Freight Variance</span>
              <div
                className="val"
                style={{ color: totalActFreight > totalEstFreight ? 'var(--bad)' : 'var(--ok)' }}
              >
                {inr(totalActFreight - totalEstFreight)}
              </div>
              <span className="sub">Est: {inr(totalEstFreight)} · Actual: {inr(totalActFreight)}</span>
            </div>
          </div>

          {/* Unloaded lots awaiting final approval */}
          <div className="card">
            <div className="card-header">
              <h2>
                Unloaded Lots Pending Final Rate Approval{' '}
                <span className="hi-label">{pendingUnloadedLots.length}</span>
              </h2>
            </div>
            <div className="items-list">
              {pendingUnloadedLots.length === 0 ? (
                <p style={{ color: 'var(--muted)', padding: '14px 0' }}>
                  No pending unloaded lots requiring settlement.
                </p>
              ) : (
                pendingUnloadedLots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="list-item-card"
                    onClick={() => setModal({ type: 'soda', data: s })}
                  >
                    <div className="item-top">
                      <span className="item-id">{s.id}</span>
                      <span className="status-pill st-Unloaded">Unloaded · Awaiting Final Payout</span>
                    </div>
                    <div>
                      <b>{s.farmer_name || s.farmer}</b> · {s.commodity || s.c} Grade {s.grade || s.g} · {centreName(s.centre)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--muted)' }}>
                      <span>Net: <b>{q(s.net_weight)} qtl</b></span>
                      <span>Agreed: <b>{inr(s.rate_snapshot?.agreed || s.snap?.agreed)}</b></span>
                      <span>Est Amount: <b>{inr(s.amount || ((s.rate_snapshot?.agreed || 0) * (s.net_weight || 0)))}</b></span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : tab === 'ledger' ? (
        /* Procurement Ledger Tab */
        <div className="card">
          <div className="card-header">
            <h2>
              Procurement Accounts Ledger <span className="hi-label">ऑडिट लेजर</span>
            </h2>
            <button type="button" className="btn sm sec" onClick={handleCopyCSV}>
              📋 Copy as CSV (for Excel)
            </button>
          </div>

          <div className="grid-row-2">
            <input
              type="text"
              placeholder="Search by ID, farmer name, village..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="FinalApproved">Final Approved</option>
              <option value="Unloaded">Unloaded</option>
              <option value="Confirmed">Confirmed</option>
              <option value="PendingApproval">Pending Approval</option>
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
                  <th className="num-cell">Net / Approx</th>
                  <th className="num-cell">Rate (₹)</th>
                  <th className="num-cell">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredSodas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>
                      No transactions match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSodas.map((s) => (
                    <tr
                      key={s.id}
                      className="clickable-row"
                      onClick={() => setModal({ type: 'soda', data: s })}
                    >
                      <td style={{ fontFamily: 'var(--f-num)', fontWeight: 700 }}>{s.id}</td>
                      <td>{s.centre}</td>
                      <td>
                        <span className={`status-pill st-${s.status}`}>{s.status}</span>
                      </td>
                      <td><b>{s.farmer_name || s.farmer}</b></td>
                      <td>{s.commodity || s.c} {s.grade || s.g}</td>
                      <td className="num-cell">{q(s.net_weight || s.approx_qty || s.qty)} qtl</td>
                      <td className="num-cell">{inr(s.final_rate || s.rate_snapshot?.agreed || s.snap?.agreed)}</td>
                      <td className="num-cell" style={{ fontWeight: 700 }}>
                        {s.amount ? inr(s.amount) : inr((s.rate_snapshot?.agreed || 0) * (s.approx_qty || s.qty || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Freight Audit Tab */
        <div className="card">
          <div className="card-header">
            <h2>Logistics & Outbound Freight Audit</h2>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Centre</th>
                  <th>Vehicle</th>
                  <th>Grade</th>
                  <th className="num-cell">Qty (qtl)</th>
                  <th className="num-cell">Est. Budget</th>
                  <th className="num-cell">Actual Paid</th>
                  <th className="num-cell">Variance</th>
                </tr>
              </thead>
              <tbody>
                {centreDispatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '18px 0' }}>
                      No dispatches recorded.
                    </td>
                  </tr>
                ) : (
                  centreDispatches.map((d) => {
                    const est = Number(d.est_freight || d.est) || 0;
                    const act = Number(d.actual_freight || d.actual) || 0;
                    const diff = act - est;
                    return (
                      <tr key={d.id}>
                        <td>{d.dispatch_date || d.date}</td>
                        <td><b>{d.centre}</b></td>
                        <td>{d.vehicle_no || d.veh}</td>
                        <td>Grade {d.grade || d.g}</td>
                        <td className="num-cell">{q(d.qty)}</td>
                        <td className="num-cell">{inr(est)}</td>
                        <td className="num-cell">{inr(act)}</td>
                        <td
                          className="num-cell"
                          style={{ color: diff > 0 ? 'var(--bad)' : 'var(--ok)', fontWeight: 700 }}
                        >
                          {diff > 0 ? `+${inr(diff)}` : diff < 0 ? `-${inr(Math.abs(diff))}` : '0'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
