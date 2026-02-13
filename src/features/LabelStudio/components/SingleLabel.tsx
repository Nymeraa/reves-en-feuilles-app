'use client';
import React from 'react';
import styles from '../LabelStudio.module.css';
import { LabelDesign, useLabelStudio } from '../context/LabelContext';

interface SingleLabelProps {
  design: LabelDesign | undefined;
  format: 'small' | 'large';
}

const SingleLabel: React.FC<SingleLabelProps> = ({ design, format }) => {
  const { selectedElementId, setSelectedElementId, trimanConfig } = useLabelStudio();

  if (!design) return null;

  // Get Triman config for this format
  const triman = trimanConfig[format];

  return (
    <div className={`${styles.labelSlot} ${format === 'small' ? styles.small : styles.large}`}>
      <div className={styles.labelWrapper}>
        <div className={styles.labelContent} style={{ backgroundColor: design.backgroundColor }}>
          {/* Triman Overlay (Global per format) */}
          {triman.enabled && triman.url && (
            <img
              src={triman.url}
              style={{
                position: 'absolute',
                left: `${triman.x}mm`,
                top: `${triman.y}mm`,
                width: '10mm',
                zIndex: 50,
                pointerEvents: 'none',
              }}
              alt="Triman"
            />
          )}

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
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${(el.fontSize || 12) * 1.33}px`,
                    color: el.color,
                    fontFamily: el.fontFamily,
                    fontWeight: 'bold',
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
              return (
                <img
                  key={el.id}
                  data-id={el.id}
                  src={el.content}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${widthMM * el.scale}mm`,
                    transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                    border: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
                    cursor: 'move',
                    userSelect: 'none',
                    zIndex: 5,
                    pointerEvents: 'auto',
                  }}
                  draggable={false}
                  alt="label element"
                />
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};

export default SingleLabel;
