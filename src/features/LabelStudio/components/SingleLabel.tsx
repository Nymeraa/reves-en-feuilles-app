'use client';
import React from 'react';
import styles from '../LabelStudio.module.css';
import { LabelDesign } from '../context/LabelContext';

interface SingleLabelProps {
  design: LabelDesign | undefined;
  format: 'small' | 'large';
}

const SingleLabel: React.FC<SingleLabelProps> = ({ design, format }) => {
  if (!design) return null;

  return (
    <div className={`${styles.labelSlot} ${format === 'small' ? styles.small : styles.large}`}>
      <div className={styles.labelWrapper}>
        <div className={styles.labelContent} style={{ backgroundColor: design.backgroundColor }}>
          {/* Visual Debug Helpers */}
          <div className={styles.debugInfo}>
            {format === 'small' ? 'Petit (Rotated 90)' : 'Grand'}
          </div>

          {/* Content Rendering */}
          {design.texts.map((text) => (
            <div
              key={text.id}
              className={styles.labelText}
              style={{
                left: `${text.x}%`,
                top: `${text.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${text.fontSize * 1.33}px`,
                color: text.color,
                fontFamily: text.fontFamily,
                fontWeight: 'bold',
              }}
            >
              {text.content}
            </div>
          ))}

          {/* Mock Debug Text */}
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              fontSize: '10px',
              color: 'rgba(0,0,0,0.3)',
            }}
          >
            [Bas Gauche]
          </div>
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              fontSize: '10px',
              color: 'rgba(0,0,0,0.3)',
            }}
          >
            [Haut Droite]
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleLabel;
