'use client';
import React from 'react';
import styles from '../LabelStudio.module.css';
import { LabelDesign, useLabelStudio } from '../context/LabelContext';

interface SingleLabelProps {
  design: LabelDesign | undefined;
  format: 'small' | 'large';
}

const SingleLabel: React.FC<SingleLabelProps> = ({ design, format }) => {
  const { selectedElementId, setSelectedElementId } = useLabelStudio();

  if (!design) return null;

  return (
    <div className={`${styles.labelSlot} ${format === 'small' ? styles.small : styles.large}`}>
      <div className={styles.labelWrapper}>
        <div className={styles.labelContent} style={{ backgroundColor: design.backgroundColor }}>
          {/* Content Rendering */}
          {design.texts.map((text) => {
            const isSelected = selectedElementId === text.id;
            return (
              <div
                key={text.id}
                data-id={text.id}
                className={styles.labelText}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElementId(text.id);
                }}
                style={{
                  left: `${text.x}%`,
                  top: `${text.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: `${text.fontSize * 1.33}px`,
                  color: text.color,
                  fontFamily: text.fontFamily,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid transparent', // Blue or transparent
                  padding: '2px', // Touch target
                  userSelect: 'none', // Prevent text selection while dragging
                  whiteSpace: 'pre', // CRITICAL: No auto-wrap, respects newlines
                  width: 'max-content',
                  maxWidth: 'none',
                  overflow: 'visible',
                }}
              >
                {text.content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SingleLabel;
