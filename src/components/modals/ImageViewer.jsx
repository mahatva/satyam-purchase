import React from 'react';
import { useApp } from '../../context/AppContext';

export const ImageViewer = () => {
  const { viewer, setViewer } = useApp();

  if (!viewer || !viewer.images || viewer.images.length === 0) return null;

  const current = viewer.images[viewer.index] || viewer.images[0];
  const total = viewer.images.length;

  const handlePrev = (e) => {
    e.stopPropagation();
    setViewer({
      ...viewer,
      index: (viewer.index - 1 + total) % total,
    });
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setViewer({
      ...viewer,
      index: (viewer.index + 1) % total,
    });
  };

  return (
    <div className="image-viewer-overlay" onClick={() => setViewer(null)}>
      <div className="viewer-top-bar" onClick={(e) => e.stopPropagation()}>
        <span style={{ fontWeight: 600 }}>{current.label || 'Inspection Photo'}</span>
        <button
          type="button"
          className="close-btn"
          style={{ background: '#333', color: '#fff', border: 0 }}
          onClick={() => setViewer(null)}
        >
          ✕
        </button>
      </div>

      <div className="viewer-stage" onClick={(e) => e.stopPropagation()}>
        <img src={current.url} alt={current.label || 'Photo'} />
      </div>

      <div className="viewer-nav" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={handlePrev}>
          ‹ Previous
        </button>
        <span style={{ fontFamily: 'var(--f-num)', fontSize: '0.9rem' }}>
          {viewer.index + 1} / {total}
        </span>
        <button type="button" onClick={handleNext}>
          Next ›
        </button>
      </div>
    </div>
  );
};
