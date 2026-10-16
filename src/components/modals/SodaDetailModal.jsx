import React from 'react';
import { useApp } from '../../context/AppContext';
import { inr, q, r0, centreName, finalCalc } from '../../utils/calculations';

export const SodaDetailModal = ({ soda, onClose }) => {
  const { role, approveSoda, cancelSoda, approveFinalRate, deleteSoda, setModal, setViewer } = useApp();

  if (!soda) return null;

  const snap = soda.rate_snapshot || soda.snap || {};
  const photos = soda.photos || [];
  const unloadPhotos = soda.unload_photos || soda.unloadPhotos || [];
  const slipImg = soda.slip_img || soda.slipImg;
  const history = soda.history || [];

  const allImages = [
    ...photos.map((url, i) => ({ url, label: `Material Photo ${i + 1}` })),
    ...unloadPhotos.map((url, i) => ({ url, label: `Unloading Photo ${i + 1}` })),
    ...(slipImg ? [{ url: slipImg, label: `Weighbridge Slip (${soda.slip_name || 'Slip'})` }] : []),
  ];

  const fc = soda.net_weight || soda.net
    ? finalCalc(soda, soda.final_moisture || soda.fm || 14, soda.net_weight || soda.net)
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontFamily: 'var(--f-num)', fontSize: '1.2rem', fontWeight: 800 }}>
              {soda.id}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
              <span className={`status-pill st-${soda.status}`}>{soda.status}</span>
              <span style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                Centre: <b>{centreName(soda.centre)}</b>
              </span>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Farmer Info */}
        <div style={{ background: 'var(--surface-alt)', padding: '14px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>
            Farmer & Origin Details
          </div>
          <dl className="kv-list">
            <dt>Farmer Name</dt>
            <dd style={{ fontFamily: 'var(--f-body)', fontWeight: 700 }}>{soda.farmer_name || soda.farmer}</dd>
            <dt>Mobile</dt>
            <dd>{soda.farmer_mobile || soda.mobile || '—'}</dd>
            <dt>Village</dt>
            <dd style={{ fontFamily: 'var(--f-body)' }}>{soda.village || '—'}</dd>
          </dl>
        </div>

        {/* Deal Terms */}
        <div style={{ background: 'var(--surface-alt)', padding: '14px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>
            Procurement Terms & Snapshot
          </div>
          <dl className="kv-list">
            <dt>Commodity & Grade</dt>
            <dd>{soda.commodity || soda.c} Grade {soda.grade || soda.g}</dd>
            <dt>Deal Date</dt>
            <dd>{soda.date_iso || soda.at}</dd>
            <dt>Moisture at Deal Time</dt>
            <dd>{snap.moistEntered || 14}%</dd>
            <dt>Expected Qty</dt>
            <dd>{q(soda.approx_qty || soda.qty)} qtl</dd>
            <dt>Ceiling Rate</dt>
            <dd>{inr(snap.ceiling)}</dd>
            <dt className="total">Agreed Rate</dt>
            <dd className="total" style={{ color: 'var(--accent)' }}>{inr(snap.agreed)}/qtl</dd>
            <dt>Estimated Lot Value</dt>
            <dd>{inr((snap.agreed || 0) * (soda.approx_qty || soda.qty || 0))}</dd>
          </dl>
        </div>

        {/* Weighbridge & Settlement */}
        {(soda.net_weight || soda.net) && (
          <div style={{ background: 'var(--accent-soft)', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink)', marginBottom: '6px' }}>
              Weighbridge Settlement & Unloading
            </div>
            <dl className="kv-list">
              <dt>Gross / Tare</dt>
              <dd>{q(soda.gross_weight || soda.gross)} / {q(soda.tare_weight || soda.tare)} qtl</dd>
              <dt>Net Weighbridge Weight</dt>
              <dd style={{ fontWeight: 700 }}>{q(soda.net_weight || soda.net)} qtl</dd>
              <dt>Final Tested Moisture</dt>
              <dd>{soda.final_moisture || soda.fm}%</dd>
              <dt className="total">Final Approved Rate</dt>
              <dd className="total">{inr(soda.final_rate || fc?.rate)}/qtl</dd>
              <dt className="total" style={{ fontSize: '1.05rem', color: 'var(--accent)' }}>Total Payout Amount</dt>
              <dd className="total" style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>
                {inr(soda.amount || fc?.amount)}
              </dd>
            </dl>
          </div>
        )}

        {/* Photos & Assets */}
        {allImages.length > 0 && (
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
              Material & Weighment Photos ({allImages.length})
            </div>
            <div className="thumbs-row">
              {allImages.map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={img.label}
                  className="thumb-img"
                  onClick={() => setViewer({ images: allImages, index: i })}
                  title={img.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {history.length > 0 && (
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
              Audit History
            </div>
            <div style={{ display: 'grid', gap: '8px', borderLeft: '2px solid var(--line)', paddingLeft: '12px' }}>
              {history.map((h, i) => (
                <div key={i} style={{ fontSize: '0.86rem' }}>
                  <div style={{ fontWeight: 600 }}>{h.a}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
                    {h.u} · {h.at ? new Date(h.at).toLocaleString('en-IN') : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Quick Action in Modal */}
        {role === 'Admin' && soda.status === 'PendingApproval' && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                approveSoda(soda.id);
                onClose();
              }}
            >
              Approve Over-Ceiling Deal
            </button>
            <button
              type="button"
              className="btn bad sm"
              onClick={() => {
                cancelSoda(soda.id, 'Rejected by Admin');
                onClose();
              }}
            >
              Cancel Soda
            </button>
          </div>
        )}

        {role === 'Admin' && soda.status === 'Unloaded' && fc && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              approveFinalRate(soda.id, fc.rate, fc.amount);
              onClose();
            }}
          >
            Approve Final Settlement Rate @ {inr(fc.rate)} ({inr(fc.amount)})
          </button>
        )}

        {/* Master Admin Controls: Edit & Delete (Admin Only) */}
        {role === 'Admin' && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
            <button
              type="button"
              className="btn sec sm"
              style={{ flex: 1 }}
              onClick={() => {
                setModal({ type: 'edit-soda', data: soda });
              }}
            >
              ✏️ Edit Entry (Admin Only)
            </button>
            <button
              type="button"
              className="btn bad sm"
              style={{ flex: 1 }}
              onClick={() => {
                if (window.confirm(`Are you sure you want to permanently delete entry ${soda.id} for ${soda.farmer_name || soda.farmer}? This action cannot be undone.`)) {
                  deleteSoda(soda.id);
                  onClose();
                }
              }}
            >
              🗑️ Delete Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
