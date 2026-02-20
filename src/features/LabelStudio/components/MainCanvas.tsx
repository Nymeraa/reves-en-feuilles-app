'use client';
import React from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio } from '../context/LabelContext';
import { ZoomIn, ZoomOut, Grid, RotateCw } from 'lucide-react';
import SingleLabel from './SingleLabel';
import { exportToPdf } from '../../../utils/pdfUtils';

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
    cropMarkOffset,
    setCropMarkOffset,
    addToHistorySnapshot,
  } = useLabelStudio();

  const [isDragging, setIsDragging] = React.useState(false);
  const [isRotated, setIsRotated] = React.useState(false); // New state for global rotation
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  // Auto-rotate for small format when switching batches
  React.useEffect(() => {
    if (activeBatchId && batches) {
      const batch = batches.find((b) => b.id === activeBatchId);
      if (batch?.format === 'small') {
        setIsRotated(true);
      } else {
        setIsRotated(false);
      }
    }
  }, [activeBatchId]); // Only run when switching batches

  const dragStartRef = React.useRef<{
    x: number;
    y: number;
    initialLabelX: number;
    initialLabelY: number;
  } | null>(null);
  const hasSnapshotRef = React.useRef(false);

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
    } else {
      // Clicked on background (not on a text element)
      const isLabel = target.closest(`.${styles.labelContent}`);
      if (!isLabel) {
        setSelectedElementId(null);
        setSelectedLabelId(null);
      } else {
        // We clicked ON a label but NOT on an element (text/image)
        setSelectedElementId(null);
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

    const deltaX = (e.clientX - dragStartRef.current.x) / zoomLevel;
    const deltaY = (e.clientY - dragStartRef.current.y) / zoomLevel;

    const { format } = activeBatch;

    // Calculate Page Deltas first (Global Rotation)
    // If Rotated -90deg (Counter-Clockwise) "L'autre sens":
    // Screen X+ (Right) -> aligns with Page Y+ (Down in Page Coords) => Page Y moves positive
    // Screen Y+ (Down) -> aligns with Page X- (Left in Page Coords) => Page X moves negative
    let pageDeltaX = isRotated ? -deltaY : deltaX;
    let pageDeltaY = isRotated ? deltaX : deltaY;

    let effectiveDX = pageDeltaX;
    let effectiveDY = pageDeltaY;

    // Apply Format-specific Label Rotation
    if (format === 'small') {
      // Small format: Label is rotated 90deg relative to Page.
      // Label X is Page Y. Label Y is Page -X.
      effectiveDX = pageDeltaY;
      effectiveDY = -pageDeltaX;
    } else {
      // Large format (Standard Portrait)
      const scaleFactor = 105 / 141;
      effectiveDX = pageDeltaX / scaleFactor;
      effectiveDY = pageDeltaY / scaleFactor;
    }

    // Convert to % of Label Dimensions
    const widthMM = format === 'small' ? 74.25 : 141;
    const heightMM = format === 'small' ? 105 : 148.5;

    const labelWidthPx = widthMM * PIXELS_PER_MM;
    const labelHeightPx = heightMM * PIXELS_PER_MM;

    const percentDeltaX = (effectiveDX / labelWidthPx) * 100;
    const percentDeltaY = (effectiveDY / labelHeightPx) * 100;

    if (!hasSnapshotRef.current) {
      addToHistorySnapshot();
      hasSnapshotRef.current = true;
    }

    updateLabelElement(
      selectedLabelId,
      selectedElementId,
      {
        x: dragStartRef.current.initialLabelX + percentDeltaX,
        y: dragStartRef.current.initialLabelY + percentDeltaY,
      },
      false // Skip history during drag
    );
  };

  const handleMouseUp = () => {
    if (isDragging) {
      // Final commit could be here if we were using a temp state,
      // but passing false to history in move updates the 'present' correctly.
      // The snapshot ensures we can undo.
      hasSnapshotRef.current = false;
    }
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

    // Récupération de la couleur de fond de la première étiquette pour le fix anti-fissure
    const gridBgFill = activeBatch.labels[0]?.design.backgroundColor || 'transparent';

    return (
      <div
        className={format === 'small' ? styles.gridSmall : styles.gridLarge}
        style={
          {
            // Variable CSS pour colorer le fond de la grille en mode export PDF
            '--grid-bg-fill': gridBgFill,
          } as React.CSSProperties
        }
      >
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

          {/* Rotation Button */}
          <button
            className={styles.toolButton}
            onClick={() => setIsRotated(!isRotated)}
            title="Pivoter la vue -90°"
            style={{ marginLeft: '0.5rem' }}
          >
            <RotateCw
              size={18}
              color={isRotated ? '#f59e0b' : '#4b5563'}
              style={{ transform: 'scaleX(-1)' }}
            />
          </button>
        </div>

        {/* Crop Marks Controls moved to Sidebar */}

        {/* Crop Marks Controls moved to Sidebar */}

        <button
          className={styles.printBtn}
          onClick={async () => {
            if (isGeneratingPdf) return;
            setIsGeneratingPdf(true);
            // On cible l'élément à capturer (la feuille A4)
            // L'ID doit être unique, on va l'ajouter au div paperA4
            await exportToPdf(
              'label-studio-paper-a4',
              `etiquettes-${activeBatch?.model || 'export'}.pdf`
            );
            setIsGeneratingPdf(false);
          }}
          disabled={isGeneratingPdf}
          style={{
            opacity: isGeneratingPdf ? 0.7 : 1,
            cursor: isGeneratingPdf ? 'wait' : 'pointer',
          }}
        >
          {isGeneratingPdf ? 'Génération en cours...' : 'Télécharger PDF (HD)'}
        </button>
      </div>

      <div className={styles.canvasArea}>
        {/* CE WRAPPER GRANDIT PHYSIQUEMENT AVEC LE ZOOM */}
        <div
          className={styles.zoomWrapper}
          style={{
            // On calcule la taille physique + une marge de sécurité de 100px
            // Si rotated, on inverse width/height du wrapper pour le scroll
            width: `calc(${isRotated ? '297mm' : '210mm'} * ${zoomLevel} + 100px)`,
            height: `calc(${isRotated ? '210mm' : '297mm'} * ${zoomLevel} + 100px)`,
          }}
        >
          {/* LA FEUILLE A4 (Qui subit le scale visuel) */}
          <div
            id="label-studio-paper-a4"
            className={`${styles.paperA4} ${showCropMarks ? styles.printMode : ''} ${styles.printQuality}`}
            style={{
              transform: `scale(${zoomLevel}) rotate(${isRotated ? '-90deg' : '0deg'})`,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* The wrapper for grid + crop marks */}
            <div className={styles.labelsGrid}>
              {renderGrid()}

              {/* Crop Marks relative to the GRID */}
              {/* Crop Marks relative to the GRID - INSET positioning */}
              {showCropMarks && (
                <>
                  <div
                    className={`${styles.cropMark} ${styles.cropMarkTL}`}
                    style={{ top: `${cropMarkOffset}mm`, left: `${cropMarkOffset}mm` }}
                  />
                  <div
                    className={`${styles.cropMark} ${styles.cropMarkTR}`}
                    style={{ top: `${cropMarkOffset}mm`, right: `${cropMarkOffset}mm` }}
                  />
                  <div
                    className={`${styles.cropMark} ${styles.cropMarkBL}`}
                    style={{ bottom: `${cropMarkOffset}mm`, left: `${cropMarkOffset}mm` }}
                  />
                  <div
                    className={`${styles.cropMark} ${styles.cropMarkBR}`}
                    style={{ bottom: `${cropMarkOffset}mm`, right: `${cropMarkOffset}mm` }}
                  />
                </>
              )}
            </div>

            {/* Global Triman Overlay - adjusted to stay relative to page if needed, or grid? 
                User didn't specify, but typically Triman is on the label. 
                If it's a global sheet overlay, it might need to be outside labelsGrid if labelsGrid is just the block. 
                But let's keep it simple for now and see if it breaks.
                Actually, checking previous code, it was absolute on paperA4. 
                Let's keep it absolute on paperA4.
            */}
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
                        width: '10mm',
                        position: 'absolute', // Re-assert absolute relative to paperA4
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
