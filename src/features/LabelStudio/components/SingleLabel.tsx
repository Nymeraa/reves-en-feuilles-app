import React, { useMemo } from 'react';
import styles from '../LabelStudio.module.css';
import { LabelDesign } from '../context/LabelContext';

interface SingleLabelProps {
  design: LabelDesign | undefined;
  format: 'small' | 'large';
  scale?: number; // Global zoom level for rendering pixels
}

const SingleLabel: React.FC<SingleLabelProps> = ({ design, format, scale = 1 }) => {
  // Constants in MM
  const MM_TO_PX = 3.78; // Base scale (same as MainCanvas)

  // Dimensions
  // Small: 74mm W x 105mm H  (Rendered rotated in 105x74 cell)
  // Large: 141mm W x 148.5mm H ? Prompt says "Auto-Scale (Squeeze): Virtual label width 141mm. Column width ~105mm."
  //   Let's assume Large is relatively square or standard A6-ish but wide?
  //   If we squeeze 141 into 105, height also squeezes.
  //   Let's stick to the prompt: Virtual Width 141mm.
  //   Height? 2 rows per A4 (297mm) -> 148.5mm height per row.

  const widthMM = format === 'small' ? 74 : 141;
  const heightMM = format === 'small' ? 105 : 148.5;

  const widthPx = widthMM * MM_TO_PX;
  const heightPx = heightMM * MM_TO_PX;

  // Transformations
  const style = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      width: `${widthPx}px`,
      height: `${heightPx}px`,
      backgroundColor: design?.backgroundColor ?? '#ffffff',
    };

    if (format === 'small') {
      // Rotation 90deg
      // The container will be centered in the cell.
      // Rotation happens at center.
      // 74x105 rotated becomes 105x74 visual space.
      baseStyle.transform = 'rotate(90deg)';
    } else {
      // Large format squeeze
      // Target width is ~105mm (half A4).
      // 105 / 141 = 0.744
      const scaleFactor = 105 / 141;
      baseStyle.transform = `scale(${scaleFactor})`;
    }

    return baseStyle;
  }, [format, widthPx, heightPx, design?.backgroundColor]);

  if (!design) return null;

  return (
    <div className={styles.labelContainer} style={style}>
      {/* Content Rendering */}
      {design.texts.map((text) => (
        <div
          key={text.id}
          className={styles.labelText}
          style={{
            left: `${text.x}%`,
            top: `${text.y}%`,
            transform: 'translate(-50%, -50%)', // Center based on coordinates
            fontSize: `${text.fontSize * 1.33}px`, // pt to px approx
            color: text.color,
            fontFamily: text.fontFamily,
            fontWeight: 'bold', // Default for now
          }}
        >
          {text.content}
        </div>
      ))}
    </div>
  );
};

export default SingleLabel;
