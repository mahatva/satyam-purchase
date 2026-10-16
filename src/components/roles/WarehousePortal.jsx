import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  M,
  TODAY,
  finalCalc,
  stock,
  r0,
  inr,
  q,
  centreName,
  samplePhoto,
} from '../../utils/calculations';

export const WarehousePortal = () => {
  const { user, centre, sodas, dispatches, expenses, unloadSoda, createDispatch, setModal, showToast } = useApp();
  const [tab, setTab] = useState('unload'); // 'unload' | 'dispatch' | 'all'

  const warehouseCentre = centre || 'DWL';
  const currentStock = stock(sodas, dispatches, warehouseCentre);

  // Unloading Form State
  const [selectedSodaId, setSelectedSodaId] = useState(null);
  const [search, setSearch] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [finalRateInput, setFinalRateInput] = useState('');
  const [unloadMoisture, setUnloadMoisture] = useState('');
  const [unloadPhotos, setUnloadPhotos] = useState([]);
  const [slipName, setSlipName] = useState(null);
  const [slipImg, setSlipImg] = useState(null);

  // Dispatch Form State
  const [vehNo, setVehNo] = useState('');
  const [destPlant, setDestPlant] = useState('Plant – Pithampur');
  const [dispatchGrade, setDispatchGrade] = useState('A');
  const [dispatchQty, setDispatchQty] = useState('');
  const [actualFreight, setActualFreight] = useState('');

  // Pending incoming sodas waiting for unloading at this centre
  const pendingSodas = (sodas || []).filter(
    (s) =>
      s.centre === warehouseCentre &&
      s.status === 'Confirmed' &&
      `${s.id} ${s.farmer_name || s.farmer}`.toLowerCase().includes(search.toLowerCase())
  );

  const selectedSoda = sodas.find((s) => s.id === selectedSodaId);
  const netWeightNum = parseFloat(netWeight) || 0;
  const agreedRate = Number(selectedSoda?.rate_snapshot?.agreed || selectedSoda?.snap?.agreed || 0);
  const finalRate = parseFloat(finalRateInput) > 0 ? parseFloat(finalRateInput) : agreedRate;
  const totalPayout = Math.round(netWeightNum * finalRate);

  // Unload Actions
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setUnloadPhotos((prev) => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleSlipUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipName(file.name);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setSlipImg(reader.result);
        reader.readAsDataURL(file);
      }
    }
  };

  const addSampleUnloadAssets = () => {
    const uPhoto = samplePhoto('Bags Unloading', '#5a6b62', '#2c3833', 'bags');
    const wSlip = samplePhoto('Weighbridge Slip', '#d8d8d0', '#a9a99e', 'slip');
    setUnloadPhotos((prev) => [...prev, uPhoto]);
    setSlipName('weighbridge-slip.jpg');
    setSlipImg(wSlip);
    showToast('Sample unloading photo & slip attached', 'info');
  };

  const handleSubmitUnload = async (e) => {
    e.preventDefault();
    if (!selectedSodaId || netWeightNum <= 0) {
      showToast('Please select a soda and enter net weighbridge weight', 'warn');
      return;
    }

    const payload = {
      net_weight: netWeightNum,
      final_moisture: parseFloat(unloadMoisture) || null,
      unload_moisture: parseFloat(unloadMoisture) || null,
      unload_photos: unloadPhotos,
      slip_name: slipName,
      slip_img: slipImg,
      final_rate: finalRate,
      amount: totalPayout,
      status: 'FinalApproved',
    };

    await unloadSoda(selectedSodaId, payload);

    // Reset
    setSelectedSodaId(null);
    setNetWeight('');
    setFinalRateInput('');
    setUnloadMoisture('');
    setUnloadPhotos([]);
    setSlipName(null);
    setSlipImg(null);
  };

  // Dispatch Actions
  const currentExpenses = (expenses && expenses[warehouseCentre]) || M.expenses[warehouseCentre] || M.expenses.DWL;
  const freightConfig = currentExpenses.find((e) => e.n === 'Freight to plant');
  const freightPerQtl = freightConfig?.vg?.[dispatchGrade] || 90;
  const estFreightTotal = (parseFloat(dispatchQty) || 0) * freightPerQtl;
  const actFreightTotal = parseFloat(actualFreight) || 0;
  const freightDiff = actFreightTotal - estFreightTotal;

  const handleSubmitDispatch = async (e) => {
    e.preventDefault();
    const qtyNum = parseFloat(dispatchQty);
    if (!vehNo || !qtyNum || qtyNum <= 0 || !actualFreight) {
      showToast('Please complete all dispatch details', 'warn');
      return;
    }
    if (qtyNum > currentStock.stock) {
      showToast('Dispatch quantity cannot exceed current stock in hand', 'bad');
      return;
    }

    const nextId = `DSP-${warehouseCentre}-${Date.now().toString().slice(-4)}`;
    const payload = {
      id: nextId,
      centre: warehouseCentre,
      dispatch_date: new Date().toISOString().slice(0, 10),
      grade: dispatchGrade,
      vehicle_no: vehNo,
      destination_plant: destPlant,
      qty: qtyNum,
      est_freight: estFreightTotal,
      actual_freight: actFreightTotal,
    };

    await createDispatch(payload);

    setVehNo('');
    setDispatchQty('');
    setActualFreight('');
  };

  const centreDispatches = (dispatches || []).filter((d) => d.centre === warehouseCentre);

  return (
    <div>
      <div className="tabs-nav">
        <button
          className={`tab-btn ${tab === 'unload' ? 'active' : ''}`}
          onClick={() => setTab('unload')}
        >
          Unload & Weighment ({pendingSodas.length})
        </button>
        <button
          className={`tab-btn ${tab === 'dispatch' ? 'active' : ''}`}
          onClick={() => setTab('dispatch')}
        >
          Plant Dispatch (Stock: {q(currentStock.stock)} qtl)
        </button>
        <button
          className={`tab-btn ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          Warehouse Lot Ledger
        </button>
      </div>

      {tab === 'unload' ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Pending Sodas Selection */}
          <div className="card">
            <div className="card-header">
              <h2>
                Incoming Confirmed Sodas · {centreName(warehouseCentre)}{' '}
                <span className="hi-label">बाकी सौदे</span>
              </h2>
            </div>

            <input
              type="text"
              placeholder="Search incoming soda by ID or farmer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="items-list">
              {pendingSodas.length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
                  No confirmed sodas currently waiting for unloading at {centreName(warehouseCentre)}.
                </p>
              ) : (
                pendingSodas.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`list-item-card ${selectedSodaId === s.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedSodaId(s.id);
                      setUnloadMoisture(String(s.rate_snapshot?.moistEntered || 14));
                    }}
                  >
                    <div className="item-top">
                      <span className="item-id">{s.id}</span>
                      <span className="status-pill st-Confirmed">Awaiting Unload</span>
                    </div>
                    <div style={{ fontSize: '0.92rem' }}>
                      <b>{s.farmer_name || s.farmer}</b> · {s.commodity || s.c} Grade {s.grade || s.g}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--muted)' }}>
                      <span>Approx: <b>{q(s.approx_qty || s.qty)} qtl</b></span>
                      <span>Agreed Rate: <b>{inr(s.rate_snapshot?.agreed || s.snap?.agreed)}</b></span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Unload & Weighbridge Form */}
          {selectedSoda && (
            <form onSubmit={handleSubmitUnload} className="card" style={{ border: '2px solid var(--accent)' }}>
              <div className="card-header">
                <h2>
                  Record Weighment for {selectedSoda.id} <span className="hi-label">उतराई व तौल</span>
                </h2>
                <button
                  type="button"
                  className="btn sec sm"
                  onClick={() => setSelectedSodaId(null)}
                >
                  ✕ Close
                </button>
              </div>

              <dl className="kv-list" style={{ background: 'var(--surface-alt)', padding: '12px', borderRadius: '8px' }}>
                <dt>Farmer</dt>
                <dd>{selectedSoda.farmer_name || selectedSoda.farmer}</dd>
                <dt>Agreed Purchase Rate</dt>
                <dd>{inr(selectedSoda.rate_snapshot?.agreed || selectedSoda.snap?.agreed)}/qtl</dd>
                <dt>Moisture at Deal Time</dt>
                <dd>{selectedSoda.rate_snapshot?.moistEntered || 14}%</dd>
                <dt>Expected Qty</dt>
                <dd>{q(selectedSoda.approx_qty || selectedSoda.qty)} qtl</dd>
              </dl>

              <div className="grid-row-3">
                <label>
                  Net Weight (qtl) <span className="hi-label">कांटा कुल नेट वजन</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 42.50"
                    value={netWeight}
                    onChange={(e) => setNetWeight(e.target.value)}
                    required
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                    Gross & tare not required · enter net weight directly
                  </small>
                </label>

                <label>
                  Final Purchase Rate ₹/qtl <span className="hi-label">तय भाव</span>
                  <input
                    type="number"
                    step="1"
                    placeholder={`Agreed rate: ₹${agreedRate}`}
                    value={finalRateInput}
                    onChange={(e) => setFinalRateInput(e.target.value)}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                    Leave blank to consider same old agreed rate (₹{agreedRate}/qtl)
                  </small>
                </label>

                <label>
                  Warehouse Moisture % <span className="hi-label">जांच नमी</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 14.5"
                    value={unloadMoisture}
                    onChange={(e) => setUnloadMoisture(e.target.value)}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                    Notes moisture only · does not change purchase price
                  </small>
                </label>
              </div>

              {/* Live Settlement Summary Preview */}
              {netWeightNum > 0 && (
                <div style={{ background: 'var(--accent-soft)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px' }}>Settlement Calculation Preview:</div>
                  <dl className="kv-list">
                    <dt>Net Weighbridge Quantity</dt>
                    <dd>{q(netWeightNum)} qtl</dd>
                    <dt>Original Agreed Deal Rate</dt>
                    <dd>{inr(agreedRate)}/qtl</dd>
                    <dt>Final Settlement Rate</dt>
                    <dd style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      {inr(finalRate)}/qtl {parseFloat(finalRateInput) > 0 ? '(Rate Overridden)' : '(Original Agreed Rate Considered)'}
                    </dd>
                    <dt>Warehouse Moisture Noted</dt>
                    <dd>{unloadMoisture ? `${unloadMoisture}% (Recorded · No Price Deduction)` : 'Standard / Not Recorded'}</dd>
                    <dt className="total" style={{ fontSize: '1.05rem', color: 'var(--accent)' }}>
                      Total Final Payable
                    </dt>
                    <dd className="total" style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>
                      {inr(totalPayout)}
                    </dd>
                  </dl>
                </div>
              )}

              {/* Upload Weighbridge Slip & Photos */}
              <div className="grid-row-2">
                <div>
                  <label>Weighment Slip (Photo / PDF)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleSlipUpload}
                  />
                  {slipName && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--ok)', marginTop: '4px' }}>
                      ✓ Attached: {slipName}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>Unloading Photos</label>
                    <button type="button" className="btn sec sm" onClick={addSampleUnloadAssets}>
                      + Sample Assets
                    </button>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              {unloadPhotos.length > 0 && (
                <div className="thumbs-row">
                  {unloadPhotos.map((p, i) => (
                    <img key={i} src={p} alt={`Unload ${i + 1}`} className="thumb-img" />
                  ))}
                  {slipImg && <img src={slipImg} alt="Slip" className="thumb-img" />}
                </div>
              )}

              <button
                type="submit"
                className="btn"
                disabled={netWeightNum <= 0}
              >
                ✓ Complete Weighment & Close Entry (तौल दर्ज कर सौदा बंद करें)
              </button>
            </form>
          )}
        </div>
      ) : tab === 'dispatch' ? (
        /* Plant Dispatch Tab */
        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <h2>
                Record Plant Dispatch · {centreName(warehouseCentre)}{' '}
                <span className="hi-label">गाड़ी रवानगी</span>
              </h2>
              <span className="status-pill st-FinalApproved" style={{ fontSize: '0.88rem' }}>
                Stock in Hand: <b>{q(currentStock.stock)} qtl</b>
              </span>
            </div>

            <form onSubmit={handleSubmitDispatch} style={{ display: 'grid', gap: '14px' }}>
              <div className="grid-row-2">
                <label>
                  Vehicle Number <span className="hi-label">गाड़ी नंबर</span>
                  <input
                    type="text"
                    placeholder="e.g. MP09 HG 4421"
                    value={vehNo}
                    onChange={(e) => setVehNo(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Destination Plant <span className="hi-label">गंतव्य</span>
                  <input
                    type="text"
                    value={destPlant}
                    onChange={(e) => setDestPlant(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                  Grade Loaded <span className="hi-label">freight slab applies</span>
                </div>
                <div className="seg-control">
                  {['A', 'B', 'C'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`seg-btn ${dispatchGrade === g ? 'active' : ''}`}
                      onClick={() => setDispatchGrade(g)}
                    >
                      Grade {g} (₹{freightConfig?.vg?.[g] || 90}/qtl)
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid-row-2">
                <label>
                  Dispatch Quantity (qtl) <span className="hi-label">मात्रा</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 40"
                    value={dispatchQty}
                    onChange={(e) => setDispatchQty(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Actual Freight Paid (₹) <span className="hi-label">भाड़ा</span>
                  <input
                    type="number"
                    placeholder="e.g. 3500"
                    value={actualFreight}
                    onChange={(e) => setActualFreight(e.target.value)}
                    required
                  />
                </label>
              </div>

              {/* Freight Variance Preview */}
              {parseFloat(dispatchQty) > 0 && (
                <div style={{ background: 'var(--surface-alt)', padding: '12px', borderRadius: '8px' }}>
                  <dl className="kv-list">
                    <dt>Estimated Freight ({q(dispatchQty)} qtl @ ₹{freightPerQtl}/qtl)</dt>
                    <dd>{inr(estFreightTotal)}</dd>
                    {actFreightTotal > 0 && (
                      <>
                        <dt>Actual Freight Paid</dt>
                        <dd>{inr(actFreightTotal)}</dd>
                        <dt className="total">Freight Variance</dt>
                        <dd
                          className="total"
                          style={{ color: freightDiff > 0 ? 'var(--bad)' : 'var(--ok)' }}
                        >
                          {freightDiff > 0 ? `+${inr(freightDiff)} over budget` : `-${inr(Math.abs(freightDiff))} saved`}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              )}

              <button
                type="submit"
                className="btn"
                disabled={!vehNo || !parseFloat(dispatchQty) || parseFloat(dispatchQty) > currentStock.stock || !actualFreight}
              >
                Save Dispatch Entry
              </button>
            </form>
          </div>

          {/* Dispatches Table */}
          <div className="card">
            <h2>Outbound Dispatches Ledger</h2>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Grade</th>
                    <th>Vehicle</th>
                    <th className="num-cell">Qty (qtl)</th>
                    <th className="num-cell">Est. Freight</th>
                    <th className="num-cell">Actual Freight</th>
                  </tr>
                </thead>
                <tbody>
                  {centreDispatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '18px 0' }}>
                        No dispatches recorded yet for {centreName(warehouseCentre)}.
                      </td>
                    </tr>
                  ) : (
                    centreDispatches.map((d) => (
                      <tr key={d.id}>
                        <td>{d.dispatch_date || d.date}</td>
                        <td>Grade {d.grade || d.g}</td>
                        <td><b>{d.vehicle_no || d.veh}</b></td>
                        <td className="num-cell">{q(d.qty)}</td>
                        <td className="num-cell">{inr(d.est_freight || d.est)}</td>
                        <td className="num-cell">{inr(d.actual_freight || d.actual)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Warehouse Lot Ledger Tab */
        <div className="card">
          <h2>All Lots Processed at {centreName(warehouseCentre)}</h2>
          <div className="items-list">
            {(sodas || [])
              .filter((s) => s.centre === warehouseCentre)
              .map((s) => (
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
                  <div>
                    <b>{s.farmer_name || s.farmer}</b> · {s.commodity || s.c} Grade {s.grade || s.g}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--muted)' }}>
                    <span>Net Weight: <b>{s.net_weight ? `${q(s.net_weight)} qtl` : 'Pending'}</b></span>
                    <span>Rate: <b>{s.final_rate ? inr(s.final_rate) : inr(s.rate_snapshot?.agreed)}</b></span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
