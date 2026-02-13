'use client';
import React from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio } from '../context/LabelContext';

const RightSidebar: React.FC = () => {
  const { selectedLabelId, selectedElementId, activeBatchId, batches, updateLabelText } =
    useLabelStudio();

  const activeBatch = batches.find((b) => b.id === activeBatchId);
  const selectedLabel = activeBatch?.labels.find((l) => l.id === selectedLabelId);
  const selectedElement = selectedLabel?.design.texts.find((t) => t.id === selectedElementId);

  if (!selectedElement) {
    return (
      <aside
        style={{
          width: '250px',
          borderLeft: '1px solid #e5e7eb',
          backgroundColor: 'white',
          padding: '1rem',
        }}
      >
        <div
          style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', marginTop: '2rem' }}
        >
          Sélectionnez un élément pour le modifier
        </div>
      </aside>
    );
  }

  // Format dimensions needed for mm conversion
  const format = activeBatch?.format || 'small';
  const widthMM = format === 'small' ? 74.25 : 141;
  const heightMM = format === 'small' ? 105 : 148.5;

  // Convert % to mm for display/edit
  const xMM = (selectedElement.x / 100) * widthMM;
  const yMM = (selectedElement.y / 100) * heightMM;

  const handleChange = (field: string, value: any) => {
    if (selectedLabel) {
      updateLabelText(selectedLabel.id, selectedElement.id, { [field]: value });
    }
  };

  const handlePositionChange = (axis: 'x' | 'y', mmValue: string) => {
    const val = parseFloat(mmValue);
    if (isNaN(val)) return;

    // Convert back to %
    const maxMM = axis === 'x' ? widthMM : heightMM;
    const percent = (val / maxMM) * 100;

    if (selectedLabel) {
      updateLabelText(selectedLabel.id, selectedElement.id, { [axis]: percent });
    }
  };

  return (
    <aside
      style={{
        width: '250px',
        borderLeft: '1px solid #e5e7eb',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Propriétés</h2>
      </div>

      <div className={styles.sidebarContent}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Contenu</label>
          <textarea
            className={styles.input}
            rows={3}
            value={selectedElement.content}
            onChange={(e) => handleChange('content', e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Position (mm)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div>
              <span className={styles.label} style={{ fontSize: '0.75rem' }}>
                X
              </span>
              <input
                type="number"
                className={styles.input}
                value={xMM.toFixed(1)}
                onChange={(e) => handlePositionChange('x', e.target.value)}
                step="0.5"
              />
            </div>
            <div>
              <span className={styles.label} style={{ fontSize: '0.75rem' }}>
                Y
              </span>
              <input
                type="number"
                className={styles.input}
                value={yMM.toFixed(1)}
                onChange={(e) => handlePositionChange('y', e.target.value)}
                step="0.5"
              />
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Taille Police (px)</label>
          <input
            type="number"
            className={styles.input}
            value={selectedElement.fontSize}
            onChange={(e) => handleChange('fontSize', parseInt(e.target.value) || 12)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Couleur</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="color"
              value={selectedElement.color}
              onChange={(e) => handleChange('color', e.target.value)}
              style={{ width: '40px', height: '40px', padding: 0, border: 'none' }}
            />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{selectedElement.color}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
