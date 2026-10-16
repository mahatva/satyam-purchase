import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  M,
  TODAY,
  YYMMDD,
  DAYS,
  calc,
  limitFor,
  booked,
  r0,
  inr,
  q,
  centreName,
  samplePhoto,
} from '../../utils/calculations';

export const OfficerPortal = () => {
  const { user, centre, sodas, prices, expenses, limits, createSoda, setModal, showToast } = useApp();
  const [tab, setTab] = useState('new'); // 'new' | 'history'

  // Calculator & Form State
  const [commodity, setCommodity] = useState('Maize');
  const [grade, setGrade] = useState('A');
  const [moisture, setMoisture] = useState('14');
  const [commission, setCommission] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Soda Form State
  const [price, setPrice] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [farmerMobile, setFarmerMobile] = useState('');
  const [village, setVillage] = useState('');
  const [approxQty, setApproxQty] = useState('');
  const [photos, setPhotos] = useState([]);
  const [createdShareCard, setCreatedShareCard] = useState(null);

  // Search & Filters in My Sodas
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const officerCentre = centre || 'DWL';
  const calculation = calc(
    officerCentre,
    commodity,
    grade,
    parseFloat(moisture) || 0,
    user?.can_cut_comm ? commission : null,
    prices,
    expenses
  );

  const negotiatedPrice = parseFloat(price) || 0;
  const isOverCeiling = negotiatedPrice > calculation.ceiling;
  const currentLimit = limitFor(limits, officerCentre, commodity, DAYS[0].iso);
  const currentBooked = booked(sodas, officerCentre, commodity, DAYS[0].iso);
  const remainingQuota = currentLimit != null ? currentLimit - currentBooked.qty : null;
  const isOverQuota =
    currentLimit != null &&
    parseFloat(approxQty) > 0 &&
    currentBooked.qty + parseFloat(approxQty) > currentLimit;

  // Handle Photo Upload
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const addSamplePhoto = () => {
    const p1 = samplePhoto('Field Grain Sample', '#c9a24a', '#8a6a2a', 'grain');
    setPhotos((prev) => [...prev, p1]);
    showToast('Sample material photo attached', 'info');
  };

  // Submit Soda
  const handleSubmitSoda = async (e) => {
    e.preventDefault();
    if (!price || !farmerName || !approxQty) {
      showToast('Please fill all required deal fields', 'warn');
      return;
    }

    const n = sodas.filter((s) => (s.id || '').startsWith(`${officerCentre}-${YYMMDD(TODAY)}`)).length + 1;
    const sodaId = `${officerCentre}-${YYMMDD(TODAY)}-${String(n).padStart(3, '0')}`;

    const requiresApproval = isOverCeiling || isOverQuota;
    const reasons = [
      ...(isOverCeiling ? ['ceiling'] : []),
      ...(isOverQuota ? ['limit'] : []),
    ];

    const sodaPayload = {
      id: sodaId,
      centre: officerCentre,
      commodity,
      grade,
      farmer_name: farmerName,
      farmer_mobile: farmerMobile || '—',
      village: village || '—',
      approx_qty: parseFloat(approxQty),
      status: requiresApproval ? 'PendingApproval' : 'Confirmed',
      reasons,
      date_iso: DAYS[0].iso,
      rate_snapshot: {
        commission: calculation.comm,
        commDefault: calculation.commDef,
        plant: calculation.plant,
        profit: calculation.profit,
        expenses: calculation.ex,
        shortage: calculation.S,
        moistEntered: parseFloat(moisture) || 14,
        baseCeil: calculation.P,
        ceiling: calculation.ceiling,
        agreed: negotiatedPrice,
      },
      photos,
      history: [
        {
          at: new Date().toISOString(),
          u: `${user.name} · Field Officer`,
          a: `Soda created${requiresApproval ? ' · Sent to Admin for approval' : ' · Confirmed'}`,
        },
      ],
    };

    await createSoda(sodaPayload);

    // Prepare WhatsApp share
    const shareText = encodeURIComponent(
      `Satyam Agrocot – Soda ${sodaId}\n${commodity} Grade ${grade}, approx ${approxQty} qtl @ ₹${price}/qtl\nMoisture: ${moisture}%\nFarmer: ${farmerName}, ${village}`
    );
    setCreatedShareCard({
      id: sodaId,
      status: requiresApproval ? 'PendingApproval' : 'Confirmed',
      url: `https://wa.me/${farmerMobile ? '91' + farmerMobile : ''}?text=${shareText}`,
    });

    // Reset Form
    setPrice('');
    setFarmerName('');
    setFarmerMobile('');
    setVillage('');
    setApproxQty('');
    setPhotos([]);
  };

  // Filter Officer Sodas
  const centreSodas = (sodas || []).filter(
    (s) =>
      s.centre === officerCentre &&
      (statusFilter === 'ALL' || s.status === statusFilter) &&
      `${s.id} ${s.farmer_name || s.farmer} ${s.village}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${tab === 'new' ? 'active' : ''}`}
          onClick={() => setTab('new')}
        >
          Ceiling Calculator & New Soda
        </button>
        <button
          className={`tab-btn ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          My Centre Sodas ({centreSodas.length})
        </button>
      </div>

      {createdShareCard && (
        <div className="card" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ color: 'var(--ink)' }}>
                Soda {createdShareCard.id} {createdShareCard.status === 'Confirmed' ? 'Confirmed!' : 'Sent for Approval'}
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--muted)', marginTop: '2px' }}>
                Purchase agreement registered successfully.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={createdShareCard.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn sm"
                style={{ background: '#25d366', color: '#fff' }}
              >
                Share on WhatsApp
              </a>
              <button
                className="btn sec sm"
                onClick={() => setCreatedShareCard(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'new' ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Section 1: Ceiling Calculator */}
          <div className="card">
            <div className="card-header">
              <h2>
                Check Ceiling Rate <span className="hi-label">सीलिंग भाव देखें</span>
              </h2>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>
                {centreName(officerCentre)}
              </span>
            </div>

            <div className="grid-row-2">
              <label>
                Commodity <span className="hi-label">फसल</span>
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                >
                  {Object.entries(M.commodities).map(([c, hindi]) => (
                    <option key={c} value={c}>
                      {c} · {hindi}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                  Grade <span className="hi-label">ग्रेड</span>
                </div>
                <div className="seg-control">
                  {['A', 'B', 'C'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`seg-btn ${grade === g ? 'active' : ''}`}
                      onClick={() => setGrade(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid-row-2">
              <label>
                Moisture % <span className="hi-label">नमी</span>
                <input
                  type="number"
                  step="0.1"
                  value={moisture}
                  onChange={(e) => setMoisture(e.target.value)}
                  placeholder="e.g. 14.5"
                />
              </label>

              {user?.can_cut_comm && (
                <label>
                  Commission % <span className="hi-label">Max {calculation.commDef}%</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={calculation.commDef}
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder={`${calculation.commDef}% (Standard)`}
                  />
                </label>
              )}
            </div>

            {/* Ceiling Result Box */}
            {calculation.blocked ? (
              <div className="ceiling-box blocked">
                <span className="label">Purchase Blocked</span>
                <div className="big-rate">Moisture exceeds {calculation.mr.max}%</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--bad)', fontWeight: 600 }}>
                  Quality standard exceeded. Do not procure this lot.
                </div>
              </div>
            ) : (
              <div className="ceiling-box">
                <span className="label">Ceiling Buying Rate · {centreName(officerCentre)}</span>
                <div className="big-rate">
                  {inr(calculation.ceiling)} <small style={{ fontSize: '1rem', fontWeight: 500 }}>/qtl</small>
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                  {calculation.excess > 0
                    ? `Deduction applied for ${q(calculation.excess)}% above base (${calculation.mr.base}%)`
                    : `At or below standard base moisture (${calculation.mr.base}%)`}
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn sec"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              {showBreakdown ? 'Hide Calculation' : 'How is this rate calculated? (भाव कैसे बना)'}
            </button>

            {showBreakdown && (
              <div style={{ background: 'var(--surface-alt)', padding: '14px', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '10px' }}>
                  Reverse calculation from Plant Delivered Price back to centre purchase ceiling:
                </p>
                <dl className="kv-list">
                  <dt>Plant Delivered Price ({commodity} Grade {grade})</dt>
                  <dd>{inr(calculation.plant)}</dd>
                  <dt>− Satyam Margin</dt>
                  <dd>{inr(calculation.profit)}</dd>
                  <dt className="total">Target Landed Cost at Plant</dt>
                  <dd className="total">{inr(calculation.T)}</dd>

                  {calculation.ex.map((e, idx) => (
                    <React.Fragment key={idx}>
                      <dt style={{ fontSize: '0.84rem' }}>
                        + {e.n} ({e.t === 'pct' ? `${e.v}%` : `₹${e.v}/qtl`})
                      </dt>
                      <dd style={{ fontSize: '0.84rem' }}>
                        {e.t === 'pct' ? `₹${r0((calculation.P * e.v) / 100)}` : `₹${e.v}`}
                      </dd>
                    </React.Fragment>
                  ))}

                  <dt>Shortage Adjustment ({(calculation.S * 100).toFixed(1)}%)</dt>
                  <dd>{(calculation.S * 100).toFixed(1)}%</dd>
                  <dt className="total">Base Centre Ceiling</dt>
                  <dd className="total">{inr(calculation.P)}</dd>
                  <dt>− Moisture Deduction</dt>
                  <dd>−{inr(calculation.mDed)}</dd>
                  <dt className="total" style={{ color: 'var(--accent)' }}>Net Ceiling Buying Rate</dt>
                  <dd className="total" style={{ color: 'var(--accent)' }}>{inr(calculation.ceiling)}/qtl</dd>
                </dl>
              </div>
            )}
          </div>

          {/* Section 2: Create Soda Form */}
          {!calculation.blocked && (
            <form onSubmit={handleSubmitSoda} className="card">
              <div className="card-header">
                <h2>
                  Book New Soda <span className="hi-label">सौदा दर्ज करें</span>
                </h2>
              </div>

              <label>
                Negotiated Price ₹/qtl <span className="hi-label">तय भाव</span>
                <input
                  type="number"
                  placeholder={`e.g. ${calculation.ceiling - 15}`}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </label>

              {negotiatedPrice > 0 && (
                <div>
                  {isOverCeiling ? (
                    <div style={{ padding: '8px 12px', background: 'var(--bad-soft)', color: 'var(--bad)', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600 }}>
                      ⚠️ ₹{negotiatedPrice - calculation.ceiling}/qtl above ceiling — requires Admin Approval before confirmation.
                    </div>
                  ) : (
                    <div style={{ padding: '8px 12px', background: 'var(--ok-soft)', color: 'var(--ok)', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600 }}>
                      ✓ Within ceiling · Saving ₹{calculation.ceiling - negotiatedPrice}/qtl for the company.
                    </div>
                  )}
                </div>
              )}

              <div className="grid-row-2">
                <label>
                  Farmer Name <span className="hi-label">किसान का नाम</span>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patidar"
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Mobile Number <span className="hi-label">मोबाइल</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={farmerMobile}
                    onChange={(e) => setFarmerMobile(e.target.value.replace(/\D/g, ''))}
                  />
                </label>
              </div>

              <div className="grid-row-2">
                <label>
                  Village <span className="hi-label">गाँव</span>
                  <input
                    type="text"
                    placeholder="e.g. Diwal / Kesur"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                  />
                </label>

                <label>
                  Approx Qty (Quintals) <span className="hi-label">मात्रा</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 50"
                    value={approxQty}
                    onChange={(e) => setApproxQty(e.target.value)}
                    required
                  />
                </label>
              </div>

              {/* Daily Limit Warning */}
              <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                {currentLimit != null ? (
                  <span>
                    Today's {commodity} quota: <b>{q(currentLimit)} qtl</b> · Booked: {q(currentBooked.qty)} qtl ·{' '}
                    <span style={{ color: remainingQuota > 0 ? 'var(--ok)' : 'var(--bad)', fontWeight: 700 }}>
                      {q(Math.max(0, remainingQuota))} qtl available
                    </span>
                  </span>
                ) : (
                  <span>No daily procurement quota restriction set for today.</span>
                )}
              </div>

              {isOverQuota && (
                <div style={{ padding: '8px 12px', background: 'var(--warn-soft)', color: 'var(--warn)', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600 }}>
                  ⚠️ This booking exceeds today's centre quota by {q(currentBooked.qty + parseFloat(approxQty) - currentLimit)} qtl. It will require Admin approval.
                </div>
              )}

              {/* Photos */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>
                    Material Inspection Photos <span className="hi-label">माल की फोटो</span>
                  </label>
                  <button type="button" className="btn sec sm" onClick={addSamplePhoto}>
                    + Add Sample Photo
                  </button>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                />
                {photos.length > 0 && (
                  <div className="thumbs-row" style={{ marginTop: '8px' }}>
                    {photos.map((p, i) => (
                      <img key={i} src={p} alt={`Material ${i + 1}`} className="thumb-img" />
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className={`btn ${isOverCeiling || isOverQuota ? 'bad' : ''}`}
                disabled={!price || !farmerName || !approxQty}
              >
                {isOverCeiling || isOverQuota ? 'Submit for Admin Approval' : 'Confirm Purchase Soda'}
              </button>
            </form>
          )}
        </div>
      ) : (
        /* My Sodas Tab */
        <div className="card">
          <div className="card-header">
            <h2>
              Centre Sodas · {centreName(officerCentre)} <span className="hi-label">सभी सौदे</span>
            </h2>
          </div>

          <input
            type="text"
            placeholder="Search soda ID, farmer name, village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['ALL', 'Confirmed', 'PendingApproval', 'Unloaded', 'FinalApproved', 'Cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn sm ${statusFilter === st ? '' : 'sec'}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="items-list">
            {centreSodas.length === 0 ? (
              <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
                No sodas match the selected criteria.
              </p>
            ) : (
              centreSodas.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="list-item-card"
                  onClick={() => setModal({ type: 'soda', data: s })}
                >
                  <div className="item-top">
                    <span className="item-id">{s.id}</span>
                    <span className={`status-pill st-${s.status}`}>{s.status}</span>
                  </div>
                  <div style={{ fontSize: '0.92rem' }}>
                    <b>{s.farmer_name || s.farmer}</b>, {s.village || '—'} · {s.commodity || s.c} Grade {s.grade || s.g}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--muted)' }}>
                    <span>Approx: <b>{q(s.approx_qty || s.qty)} qtl</b></span>
                    <span>Agreed: <b>{inr(s.rate_snapshot?.agreed || s.snap?.agreed)}/qtl</b></span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
