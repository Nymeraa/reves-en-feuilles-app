'use client';
import React from 'react';
import styles from '../LabelStudio.module.css';
import { LabelDesign, useLabelStudio } from '../context/LabelContext';

interface SingleLabelProps {
  labelId: string;
  design: LabelDesign | undefined;
  format: 'small' | 'large';
}

/** Z-index hierarchy: text always on top, images in the middle, backgrounds at the back. */
const getZIndex = (type: string): number => {
  if (type === 'text') return 100;
  if (type === 'image' || type === 'illustration') return 10;
  if (type === 'background' || type === 'shape') return 1;
  return 50;
};

const SingleLabel: React.FC<SingleLabelProps> = ({ labelId, design, format }) => {
  const { selectedElementId, setSelectedElementId, selectedLabelId, setSelectedLabelId } =
    useLabelStudio();

  if (!design) return null;

  const isLabelSelected = selectedLabelId === labelId;

  console.log('SingleLabel render:', { id: labelId, color: design.backgroundColor });

  return (
    <div
      className={`${styles.labelSlot} ${format === 'small' ? styles.small : styles.large}`}
      style={{ '--label-bg-color': design.backgroundColor || '#ffffff' } as React.CSSProperties}
    >
      <div className={styles.labelWrapper}>
        <div
          className={styles.labelContent}
          style={
            {
              backgroundColor: design.backgroundColor ? design.backgroundColor : '#ffffff',
              backgroundImage: design.backgroundImage ? `url(${design.backgroundImage})` : 'none',
              // FIX: Variable pour le CSS bleed lors de l'export PDF
              '--label-bg-color': design.backgroundColor || '#ffffff',
              cursor: 'pointer',
              border: isLabelSelected ? '2px solid #10b981' : '1px solid #e5e7eb',
              boxSizing: 'border-box',
              // FIX: Assurer le rendu du fond et empêcher les débordements globaux
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              overflow: 'hidden',
            } as React.CSSProperties
          }
          onClick={() => {
            setSelectedLabelId(labelId);
          }}
        >
          {/* Elements Rendering */}
          {design.elements.map((el) => {
            const isSelected = selectedElementId === el.id;

            if (el.type === 'text') {
              return (
                <div
                  key={el.id}
                  data-id={el.id}
                  className={styles.labelText}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                  }}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    transformOrigin: 'center center',
                    zIndex: getZIndex(el.type),
                    fontSize: `${(el.fontSize || 12) * 1.33}px`,
                    color: el.color,
                    fontFamily: el.fontFamily,
                    fontWeight: el.fontWeight || 'normal',
                    fontStyle: el.fontStyle || 'normal',
                    textDecoration: el.textDecoration || 'none',
                    textAlign: el.textAlign || 'left',
                    transform: `rotate(${el.rotation}deg) scale(${el.scale})`,
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #3b82f6' : '1px solid transparent', // Blue or transparent
                    padding: '2px', // Touch target
                    userSelect: 'none', // Prevent text selection while dragging
                    whiteSpace: 'pre', // CRITICAL: No auto-wrap
                    width: 'max-content',
                    maxWidth: 'none',
                    overflow: 'visible',
                  }}
                >
                  {el.content}
                </div>
              );
            } else if (el.type === 'image') {
              const widthMM = el.width || 20;
              // Calcul robuste des dimensions en pixels pour l'affichage
              const pixelWidth = Math.round(widthMM * el.scale * 3.78);
              const pixelHeight = el.height ? Math.round(el.height * el.scale * 3.78) : null;

              const safeWidth = `${pixelWidth}px`;
              const safeHeight = pixelHeight ? `${pixelHeight}px` : 'auto';

              console.log('Rendu Image:', {
                id: el.id,
                mm: widthMM,
                px: pixelWidth,
                safeW: safeWidth,
                safeH: safeHeight,
              });

              return (
                <div
                  key={el.id}
                  data-id={el.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: safeWidth,
                    height: safeHeight,
                    transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                    border: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
                    cursor: 'move',
                    userSelect: 'none',
                    zIndex: getZIndex(el.type),
                    pointerEvents: 'auto',
                    // FIX: Overflow visible pour déboguer l'affichage, html-to-image gérera le crop via foreignObject
                    overflow: 'visible',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <img
                    src={el.content}
                    crossOrigin="anonymous"
                    draggable={false}
                    alt="label element"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      pointerEvents: 'none',
                    }}
                    // Fallback attributes
                    width={pixelWidth}
                    height={pixelHeight || undefined}
                  />
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};

export default SingleLabel;
