'use client';
import React from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio } from '../context/LabelContext';
import { ZoomIn, ZoomOut, Grid } from 'lucide-react';
import SingleLabel from './SingleLabel';

const MainCanvas: React.FC = () => {
  const { zoomLevel, setZoomLevel, activeBatchId, batches } = useLabelStudio();

  const activeBatch = batches.find((b) => b.id === activeBatchId);

  // A4 dimensions in mm: 210 x 297
  // We'll use a base scale where 1mm = 3px (approx) for display
  const PIXELS_PER_MM = 3.78; // 96 DPI / 25.4
  const widthPx = 210 * PIXELS_PER_MM;
  const heightPx = 297 * PIXELS_PER_MM;

  // Render Grid Cells based on Format
  const renderGrid = () => {
    if (!activeBatch) {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ccc',
          }}
        >
          Aucun lot sélectionné
        </div>
      );
    }

    const { format, quantity } = activeBatch;
    const labelsPerPage = format === 'small' ? 8 : 4;
    // For now, we only visualize the first page or up to quantity
    const count = Math.min(quantity, labelsPerPage);
    const cells = Array.from({ length: labelsPerPage }); // Always render full page grid

    return (
      <div className={format === 'small' ? styles.gridSmall : styles.gridLarge}>
        {cells.map((_, index) =>
          index < quantity ? (
            <SingleLabel key={index} design={activeBatch.design} format={format} />
          ) : (
            <div key={index} className={styles.labelSlot}></div>
          )
        )}
      </div>
    );
  };

  return (
    <main className={styles.mainCanvas}>
      <div className={styles.toolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Zoom: {Math.round(zoomLevel * 100)}%
          </span>
          <button
            className="p-1 hover:bg-gray-100 rounded"
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
          >
            <ZoomOut size={18} color="#4b5563" />
          </button>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
            style={{ width: '100px' }}
          />
          <button
            className="p-1 hover:bg-gray-100 rounded"
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
          >
            <ZoomIn size={18} color="#4b5563" />
          </button>
        </div>

        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <Grid size={18} />
          <span>Guides</span>
        </button>
      </div>

      <div className={styles.canvasArea}>
        <div
          className={styles.paperA4}
          style={{
            width: `${widthPx}px`,
            height: `${heightPx}px`,
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center top',
            transition: 'transform 0.2s ease-out',
            // background: 'white' (already in CSS)
          }}
        >
          {renderGrid()}
        </div>
      </div>
    </main>
  );
};

export default MainCanvas;
