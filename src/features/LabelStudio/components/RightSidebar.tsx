'use client';
import React from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio } from '../context/LabelContext';

const RightSidebar: React.FC = () => {
  const {
    selectedLabelId,
    selectedElementId,
    activeBatchId,
    batches,
    updateLabelElement,
    updateLabel,
    clearLabel,
    removeElement,
    duplicateLabelDesign,
    duplicateSideDesign,
    saveAsDefaultTemplate,
  } = useLabelStudio();

  const activeBatch = batches.find((b) => b.id === activeBatchId);
  const selectedLabel = activeBatch?.labels.find((l) => l.id === selectedLabelId);
  const selectedElement = selectedLabel?.design.elements.find((t) => t.id === selectedElementId);

  const handleDuplicateSideDesign = () => {
    if (selectedLabelId) {
      duplicateSideDesign(selectedLabelId);
    }
  };

  // If no label is selected, show empty state
  if (!selectedLabelId) {
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
          Sélectionnez une étiquette
        </div>
      </aside>
    );
  }

  // If label is selected but no element, show duplication button only
  if (!selectedElement) {
    return (
      <aside
        style={{
          width: '250px',
          borderLeft: '1px solid #e5e7eb',
          backgroundColor: 'white',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <button
          onClick={handleDuplicateSideDesign}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
        >
          ❐ Appliquer à toutes les faces {selectedLabel?.side === 'front' ? 'Avant' : 'Arrière'}
        </button>

        {/* Save as Template Button */}
        <button
          onClick={() => {
            if (activeBatch && selectedLabel) {
              saveAsDefaultTemplate(
                activeBatch.format,
                selectedLabel.side,
                selectedLabel.design.elements
              );
              alert(
                `Modèle sauvegardé pour ${activeBatch.format === 'small' ? 'Petit' : 'Grand'} - ${selectedLabel.side === 'front' ? 'Avant' : 'Arrière'} !`
              );
            }
          }}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
        >
          💾 Sauver comme modèle par défaut
        </button>

        {/* Clear Label Button */}
        <button
          onClick={() => {
            if (selectedLabelId) {
              // Use updateLabel to properly reset all properties
              updateLabel(selectedLabelId, {
                design: {
                  elements: [],
                  backgroundColor: '#ffffff',
                  backgroundImage: null,
                  triman: {
                    enabled: false,
                    x: 0,
                    y: 0,
                    format: 'standard',
                  },
                },
                backgroundColor: '#ffffff',
                backgroundImage: null,
              });
            }
          }}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
        >
          🗑️ Vider l'étiquette
        </button>

        {/* Background Color Palette */}
        <div>
          <label
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            Couleur de fond
          </label>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {[
              '#b8cbe6',
              '#a1b7d8',
              '#c4d5a9',
              '#d9e8c0',
              '#e8c4cf',
              '#e8b3aa',
              '#f39c8f',
              '#f08474',
              '#e8be6a',
              '#fceebe',
              '#ffffff',
            ].map((color) => (
              <button
                key={color}
                onClick={() => {
                  console.log('Changement couleur demandé :', color);
                  updateLabel(selectedLabelId, { backgroundColor: color });
                }}
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: color,
                  border:
                    selectedLabel?.backgroundColor === color
                      ? '2px solid #3b82f6'
                      : '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div
          style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', marginTop: '1rem' }}
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
      updateLabelElement(selectedLabel.id, selectedElement.id, { [field]: value });
    }
  };

  const handlePositionChange = (axis: 'x' | 'y', mmValue: string) => {
    const val = parseFloat(mmValue);
    if (isNaN(val)) return;

    // Convert back to %
    const maxMM = axis === 'x' ? widthMM : heightMM;
    const percent = (val / maxMM) * 100;

    if (selectedLabel) {
      updateLabelElement(selectedLabel.id, selectedElement.id, { [axis]: percent });
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
      {/* Duplication Button */}
      <button
        onClick={handleDuplicateSideDesign}
        style={{
          margin: '1rem',
          padding: '0.75rem 1rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
      >
        🔄 Appliquer ce design à tout le lot
      </button>

      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Propriétés</h2>
      </div>

      <div className={styles.sidebarContent}>
        {selectedElement.type === 'text' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Contenu</label>
            <textarea
              className={styles.input}
              rows={3}
              value={selectedElement.content}
              onChange={(e) => handleChange('content', e.target.value)}
            />
          </div>
        )}

        {selectedElement.type === 'image' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Dimensions (mm)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <span className={styles.label} style={{ fontSize: '0.75rem' }}>
                  Largeur
                </span>
                <input
                  type="number"
                  className={styles.input}
                  value={selectedElement.width || 20}
                  onChange={(e) => handleChange('width', parseFloat(e.target.value))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span className={styles.label} style={{ fontSize: '0.75rem' }}>
                  Echelle
                </span>
                <input
                  type="number"
                  className={styles.input}
                  step="0.1"
                  value={selectedElement.scale}
                  onChange={(e) => handleChange('scale', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

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
          <label className={styles.label}>Rotation (°)</label>
          <input
            type="number"
            className={styles.input}
            value={selectedElement.rotation}
            onChange={(e) => handleChange('rotation', parseFloat(e.target.value))}
          />
        </div>

        {/* Delete Element Button */}
        <button
          onClick={() => {
            if (selectedLabelId && selectedElementId) {
              removeElement(selectedLabelId, selectedElementId);
            }
          }}
          style={{
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '10px',
            width: '100%',
            marginTop: '15px',
            cursor: 'pointer',
            borderRadius: '6px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
        >
          🗑️ Supprimer l'élément
        </button>

        {selectedElement.type === 'text' && (
          <>
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
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {selectedElement.color}
                </span>
              </div>
              {/* Color Presets */}
              <div style={{ marginTop: '0.5rem' }}>
                <span
                  className={styles.label}
                  style={{ fontSize: '0.75rem', marginBottom: '0.25rem', display: 'block' }}
                >
                  Couleurs rapides
                </span>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {['#000000', '#FFFFFF', '#6a3278', '#E8D5C4', '#2F4F4F', '#8B4513'].map(
                    (color) => (
                      <button
                        key={color}
                        onClick={() => handleChange('color', color)}
                        style={{
                          width: '30px',
                          height: '30px',
                          backgroundColor: color,
                          border:
                            selectedElement.color === color
                              ? '2px solid #3b82f6'
                              : '1px solid #d1d5db',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        title={color}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default RightSidebar;
