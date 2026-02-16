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
    removeElement,
    trimanConfig,
    undo,
    redo,
    canUndo,
    canRedo,
    showCropMarks,
    toggleCropMarks,
  } = useLabelStudio();

  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef<{
    x: number;
    y: number;
    initialLabelX: number;
    initialLabelY: number;
  } | null>(null);

  const activeBatch = batches.find((b) => b.id === activeBatchId);

  // Global keyboard handler for Shortcuts
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId && selectedLabelId) {
        e.preventDefault();
        removeElement(selectedLabelId, selectedElementId);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedElementId, selectedLabelId, removeElement, undo, redo, canUndo, canRedo]);

  const PIXELS_PER_MM = 3.78; // 96 DPI / 25.4

  // ... (mouse handlers remain same)

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const textId = target.dataset.id;

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

    const { format } = activeBatch;

    return (
      <div className={format === 'small' ? styles.gridSmall : styles.gridLarge}>
        {activeBatch.labels.map((labelData) => (
          <SingleLabel
            key={labelData.id}
            labelId={labelData.id}
            design={labelData.design}
            format={format}
          />
        ))}
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
        {/* Undo / Redo */}
        <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            className={styles.toolButton}
            style={{ opacity: canUndo ? 1 : 0.5, cursor: canUndo ? 'pointer' : 'default' }}
            title="Annuler (Ctrl+Z)"
          >
            ↩️
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={styles.toolButton}
            style={{ opacity: canRedo ? 1 : 0.5, cursor: canRedo ? 'pointer' : 'default' }}
            title="Rétablir (Ctrl+Y)"
          >
            ↪️
          </button>
        </div>

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

        {/* Separator */}
        <div style={{ width: '1px', height: '20px', background: '#ccc', margin: '0 10px' }} />

        {/* Crop Marks Toggle */}
        <button
          className={styles.toolButton}
          onClick={toggleCropMarks}
          style={{
            backgroundColor: showCropMarks ? '#e5e7eb' : 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
          title="Afficher traits de coupe"
        >
          ✂️ <span style={{ fontSize: '0.8rem' }}>Traits de coupe</span>
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
            className={`${styles.paperA4} ${showCropMarks ? styles.printMode : ''}`}
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
