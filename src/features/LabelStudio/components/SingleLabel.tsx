'use client';
import React, { useMemo } from 'react';
import styles from '../LabelStudio.module.css';
import { LabelDesign } from '../context/LabelContext';

interface SingleLabelProps {
  design: LabelDesign | undefined;
  format: 'small' | 'large';
  scale?: number; // Global zoom level for rendering pixels
}

const SingleLabel: React.FC<SingleLabelProps> = ({ design, format }) => {
  // Constants in MM
  const MM_TO_PX = 3.78; // Base scale (same as MainCanvas)

  // GEOMETRY DEFINITION
  // 1. SMALL FORMAT (<= 50g)
  //    Target Grid Cell: 105mm (W) x 74.25mm (H) [Landscape]
  //    Label Content:    74.25mm (W) x 105mm (H) [Portrait]
  //    Transform:        Rotate 90deg

  // 2. LARGE FORMAT (> 50g)
  //    Target Grid Cell: 105mm (W) x 148.5mm (H) [Portrait]
  //    Label Content:    141mm (W) x (Height?) let's assume ratio.
  //                      If using A6-like, maybe 148mm H?
  //    Transform:        Scale to fit width 105mm.

  const geometry = useMemo(() => {
    let widthMM = 74.25;
    let heightMM = 105;
    let transform = 'rotate(90deg)';

    if (format === 'large') {
      widthMM = 141; // Virtual width
      heightMM = 148.5; // Virtual height (filling the cell height visually before scale)
      // Scale calculation: 105mm (Cell W) / 141mm (Label W) = 0.744
      const scaleFactor = 105 / 141;
      transform = `scale(${scaleFactor})`;
    }

    return {
      widthPx: widthMM * MM_TO_PX,
      heightPx: heightMM * MM_TO_PX,
      transform,
    };
  }, [format]);

  if (!design) return null;

  return (
    <div
      className={styles.labelContent}
      style={{
        width: `${geometry.widthPx}px`,
        height: `${geometry.heightPx}px`,
        backgroundColor: design.backgroundColor,
        transform: geometry.transform,
      }}
    >
      {/* Visual Debug Helpers */}
      <div className={styles.debugInfo}>
        {format === 'small' ? 'Petit (Rotated)' : 'Grand (Scaled)'}
        <br />
        {Math.round(geometry.widthPx / 3.78)}x{Math.round(geometry.heightPx / 3.78)}mm
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

      {/* Mock Debug Text specific to rendering check */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          fontSize: '12px',
          color: 'rgba(0,0,0,0.5)',
        }}
      >
        [Bas Gauche]
      </div>
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          fontSize: '12px',
          color: 'rgba(0,0,0,0.5)',
        }}
      >
        [Haut Droite]
      </div>
    </div>
  );
};

export default SingleLabel;
