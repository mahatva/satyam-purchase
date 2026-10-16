import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { M, inr, centreName } from '../../utils/calculations';

export const EditSodaModal = ({ soda, onClose }) => {
  const { role, editSoda, showToast } = useApp();

  if (!soda) return null;
  if (role !== 'Admin') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Access Restricted</h2>
            <button type="button" className="close-btn" onClick={onClose}>✕</button>
          </div>
          <p style={{ color: 'var(--bad)' }}>Only Administrators are authorized to edit procurement entries.</p>
        </div>
      </div>
    );
  }

  const [farmerName, setFarmerName] = useState(soda.farmer_name || soda.farmer || '');
  const [farmerMobile, setFarmerMobile] = useState(soda.farmer_mobile || soda.mobile || '');
  const [village, setVillage] = useState(soda.village || '');
  const [commodity, setCommodity] = useState(soda.commodity || soda.c || 'Maize');
  const [grade, setGrade] = useState(soda.grade || soda.g || 'A');
  const [approxQty, setApproxQty] = useState(String(soda.approx_qty || soda.qty || ''));
  const [netWeight, setNetWeight] = useState(String(soda.net_weight || soda.net || ''));
  const [agreedRate, setAgreedRate] = useState(
    String(soda.rate_snapshot?.agreed || soda.snap?.agreed || '')
  );
  const [finalRate, setFinalRate] = useState(String(soda.final_rate || ''));
  const [dealMoisture, setDealMoisture] = useState(
    String(soda.rate_snapshot?.moistEntered || soda.snap?.moistEntered || 14)
  );
  const [finalMoisture, setFinalMoisture] = useState(
    String(soda.final_moisture || soda.fm || '')
  );
  const [status, setStatus] = useState(soda.status || 'Confirmed');
  const [adminNote, setAdminNote] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!farmerName.trim()) {
      showToast('Farmer name cannot be blank', 'warn');
      return;
    }

    const qtyNum = parseFloat(approxQty) || 0;
    const netNum = parseFloat(netWeight) > 0 ? parseFloat(netWeight) : null;
    const rateNum = parseFloat(agreedRate) || 0;
    const finalRateNum = parseFloat(finalRate) > 0 ? parseFloat(finalRate) : null;
    const amountNum = (finalRateNum || rateNum) * (netNum || qtyNum);

    const updatedSnap = {
      ...(soda.rate_snapshot || soda.snap || {}),
      agreed: rateNum,
      moistEntered: parseFloat(dealMoisture) || 14,
    };

    const payload = {
      farmer_name: farmerName.trim(),
      farmer_mobile: farmerMobile.trim() || '—',
      village: village.trim() || '—',
      commodity,
      grade,
      approx_qty: qtyNum,
      net_weight: netNum,
      final_rate: finalRateNum,
      amount: Math.round(amountNum),
      final_moisture: parseFloat(finalMoisture) || null,
      status,
      rate_snapshot: updatedSnap,
      ...(adminNote ? { admin_note: adminNote } : {}),
    };

    const success = await editSoda(soda.id, payload);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div>
            <div style={{ fontFamily: 'var(--f-num)', fontSize: '1.15rem', fontWeight: 800 }}>
              Edit Entry: {soda.id}
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
              Centre: <b>{centreName(soda.centre)}</b> · Administrator Override
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <div className="grid-row-2">
            <label>
              Farmer Full Name <span className="hi-label">किसान का नाम</span>
              <input
                type="text"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                required
              />
            </label>

            <label>
              Farmer Mobile <span className="hi-label">मोबाइल</span>
              <input
                type="text"
                value={farmerMobile}
                onChange={(e) => setFarmerMobile(e.target.value)}
              />
            </label>
          </div>

          <div className="grid-row-2">
            <label>
              Village / Mandi Origin <span className="hi-label">गाँव / मंडी</span>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
              />
            </label>

            <label>
              Status <span className="hi-label">स्थिति</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Confirmed">Confirmed</option>
                <option value="PendingApproval">Pending Approval</option>
                <option value="FinalApproved">Final Approved / Closed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          <div className="grid-row-2">
            <label>
              Commodity <span className="hi-label">फसल</span>
              <select value={commodity} onChange={(e) => setCommodity(e.target.value)}>
                {Object.keys(M.commodities).map((c) => (
                  <option key={c} value={c}>
                    {c} · {M.commodities[c]}
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
              Approximate Lot Qty (qtl) <span className="hi-label">अनुमानित वजन</span>
              <input
                type="number"
                step="0.01"
                value={approxQty}
                onChange={(e) => setApproxQty(e.target.value)}
                required
              />
            </label>

            <label>
              Net Weighbridge Weight (qtl) <span className="hi-label">कांटा नेट वजन</span>
              <input
                type="number"
                step="0.01"
                placeholder="Optional (if weighed)"
                value={netWeight}
                onChange={(e) => setNetWeight(e.target.value)}
              />
            </label>
          </div>

          <div className="grid-row-2">
            <label>
              Agreed Deal Rate (₹/qtl) <span className="hi-label">तय भाव</span>
              <input
                type="number"
                step="1"
                value={agreedRate}
                onChange={(e) => setAgreedRate(e.target.value)}
                required
              />
            </label>

            <label>
              Final Settlement Rate (₹/qtl) <span className="hi-label">अंतिम भाव</span>
              <input
                type="number"
                step="1"
                placeholder="Leave blank to match agreed"
                value={finalRate}
                onChange={(e) => setFinalRate(e.target.value)}
              />
            </label>
          </div>

          <div className="grid-row-2">
            <label>
              Deal Moisture % <span className="hi-label">सौदा नमी</span>
              <input
                type="number"
                step="0.1"
                value={dealMoisture}
                onChange={(e) => setDealMoisture(e.target.value)}
              />
            </label>

            <label>
              Warehouse Tested Moisture % <span className="hi-label">उतराई नमी</span>
              <input
                type="number"
                step="0.1"
                placeholder="Optional (recorded)"
                value={finalMoisture}
                onChange={(e) => setFinalMoisture(e.target.value)}
              />
            </label>
          </div>

          <label>
            Admin Modification Note <span className="hi-label">बदलाव का कारण</span>
            <input
              type="text"
              placeholder="e.g. Corrected weight after weighbridge recalibration"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </label>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn sec" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
