'use client';
import React from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio } from '../context/LabelContext';
import { ZoomIn, ZoomOut, Grid } from 'lucide-react';
import SingleLabel from './SingleLabel';

const MainCanvas: React.FC = () => {
  const {
    zoomLevel,
    setZoomLevel,
    activeBatchId,
    batches,
    selectedLabelId,
    setSelectedLabelId,
    selectedElementId,
    setSelectedElementId,
    updateLabelElement,
    trimanConfig,
  } = useLabelStudio();

  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef<{
    x: number;
    y: number;
    initialLabelX: number;
    initialLabelY: number;
  } | null>(null);

  const activeBatch = batches.find((b) => b.id === activeBatchId);

  // A4 dimensions in mm: 210 x 297
  // We'll use a base scale where 1mm = 3px (approx) for display
  const PIXELS_PER_MM = 3.78; // 96 DPI / 25.4
  const widthPx = 210 * PIXELS_PER_MM;
  const heightPx = 297 * PIXELS_PER_MM;

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const textId = target.dataset.id;

    // We need to find which label this text belongs to.
    // In the new structure, we have batch -> labels[] -> design -> texts[]

    if (textId && activeBatch) {
      e.preventDefault();

      // Find the label and element
      let foundLabelId = null;
      let foundElement = null;

      for (const label of activeBatch.labels) {
        const element = label.design.elements.find((el) => el.id === textId);
        if (element) {
          foundLabelId = label.id;
          foundElement = element;
          break;
        }
      }

      if (foundElement && foundLabelId) {
        setSelectedLabelId(foundLabelId);
        setSelectedElementId(textId);
        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          initialLabelX: foundElement.x,
          initialLabelY: foundElement.y,
        };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (
      !isDragging ||
      !dragStartRef.current ||
      !activeBatch ||
      !selectedElementId ||
      !selectedLabelId
    )
      return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const { format } = activeBatch;
    let effectiveDX = deltaX;
    let effectiveDY = deltaY;

    // Rotation / Scale Logic
    if (format === 'small') {
      // Rotated 90 deg: Mouse Right (X+) -> Label Down (Y+) | Mouse Down (Y+) -> Label Left (X-)
      effectiveDX = deltaY;
      effectiveDY = -deltaX;
    } else {
      // Large format is scaled
      const scaleFactor = 105 / 141; // ~0.744
      effectiveDX = deltaX / scaleFactor;
      effectiveDY = deltaY / scaleFactor;
    }

    // Convert to % of Label Dimensions
    const widthMM = format === 'small' ? 74.25 : 141;
    const heightMM = format === 'small' ? 105 : 148.5;

    const labelWidthPx = widthMM * PIXELS_PER_MM;
    const labelHeightPx = heightMM * PIXELS_PER_MM;

    const percentDeltaX = (effectiveDX / labelWidthPx) * 100;
    const percentDeltaY = (effectiveDY / labelHeightPx) * 100;

    updateLabelElement(selectedLabelId, selectedElementId, {
      x: dragStartRef.current.initialLabelX + percentDeltaX,
      y: dragStartRef.current.initialLabelY + percentDeltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

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
        {cells.map((_, index) => {
          const labelData = activeBatch.labels[index];
          return index < quantity && labelData ? (
            <SingleLabel
              key={index}
              labelId={labelData.id}
              design={labelData.design}
              format={format}
            />
          ) : (
            <div key={index} className={styles.labelSlot}></div>
          );
        })}
      </div>
    );
  };

  return (
    <main
      className={styles.mainCanvas}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
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

        <button className={styles.printBtn} onClick={() => window.print()}>
          🖨️ Imprimer / PDF
        </button>
      </div>

      <div className={styles.canvasArea}>
        {/* CE WRAPPER GRANDIT PHYSIQUEMENT AVEC LE ZOOM */}
        <div
          className={styles.zoomWrapper}
          style={{
            // On calcule la taille physique + une marge de sécurité de 100px
            width: `calc(210mm * ${zoomLevel} + 100px)`,
            height: `calc(297mm * ${zoomLevel} + 100px)`,
          }}
        >
          {/* LA FEUILLE A4 (Qui subit le scale visuel) */}
          <div
            className={styles.paperA4}
            style={{
              transform: `scale(${zoomLevel})`,
            }}
          >
            {renderGrid()}

            {/* Global Triman Overlay */}
            {activeBatch &&
              (() => {
                const format = activeBatch.format;
                const triman = trimanConfig[format];
                if (triman?.enabled && triman?.url) {
                  return (
                    <img
                      src={triman.url}
                      className={styles.trimanOverlay}
                      style={{
                        left: `${triman.x}mm`,
                        top: `${triman.y}mm`,
                        width: '10mm', // Fixed width for standard Triman
                      }}
                      alt="Triman Overlay"
                    />
                  );
                }
                return null;
              })()}
          </div>
        </div>
      </div>
    </main>
  );
};

export default MainCanvas;
