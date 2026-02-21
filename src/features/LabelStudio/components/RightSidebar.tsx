'use client';
import React, { useState } from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio } from '../context/LabelContext';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

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
    customFonts,
    presets,
    savePreset,
    applyPreset,
    deletePreset,
    movePresetToFolder,
    addElementToLabel,
  } = useLabelStudio();

  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const [presetName, setPresetName] = useState('');

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
                  if (selectedLabel) {
                    updateLabel(selectedLabelId, {
                      backgroundColor: color,
                      design: { ...selectedLabel.design, backgroundColor: color },
                    });
                  }
                }}
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: color,
                  border:
                    selectedLabel?.design?.backgroundColor === color
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

          {/* --- Bloc Couleur Personnalisée --- */}
          <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#666',
                marginBottom: '8px',
                display: 'block',
              }}
            >
              Couleur personnalisée
            </label>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* 1. Le Sélecteur Visuel (Pipette) */}
              <div
                style={{
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '1px solid #ddd',
                }}
              >
                <input
                  type="color"
                  value={selectedLabel?.design?.backgroundColor || '#ffffff'}
                  onChange={(e) => {
                    if (selectedLabel) {
                      updateLabel(selectedLabelId, {
                        backgroundColor: e.target.value,
                        design: { ...selectedLabel.design, backgroundColor: e.target.value },
                      });
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    cursor: 'pointer',
                    padding: 0,
                    margin: 0,
                  }}
                  title="Choisir une couleur"
                />
              </div>

              {/* 2. Le Champ Texte Hexadécimal */}
              <input
                type="text"
                value={selectedLabel?.design?.backgroundColor || '#ffffff'}
                onChange={(e) => {
                  if (selectedLabel) {
                    updateLabel(selectedLabelId, {
                      backgroundColor: e.target.value,
                      design: { ...selectedLabel.design, backgroundColor: e.target.value },
                    });
                  }
                }}
                placeholder="#FFFFFF"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  textTransform: 'uppercase',
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            color: '#9ca3af',
            fontSize: '0.875rem',
            textAlign: 'center',
            marginTop: '1rem',
            marginBottom: '1rem',
          }}
        >
          Sélectionnez un élément pour le modifier
        </div>

        {/* Add Text Button when viewing label global properties */}
        <button
          onClick={() => {
            if (selectedLabelId) {
              const newText = {
                id: `txt_${Date.now()}`,
                type: 'text' as const,
                content: 'Nouveau Texte',
                x: 50,
                y: 50,
                rotation: 0,
                scale: 1,
                fontSize: 12,
                color: '#000000',
                fontFamily: 'Arial',
                textAlign: 'center' as const,
              };
              addElementToLabel(selectedLabelId, newText);
            }
          }}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            backgroundColor: '#8b5cf6',
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
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#8b5cf6')}
        >
          ➕ Ajouter un texte
        </button>
      </aside>
    );
  }

  // Format dimensions needed for mm conversion
  const format = activeBatch?.format || 'small';
  const widthMM = format === 'small' ? 74.25 : 141;
  const heightMM = format === 'small' ? 105 : 148.5;

  const availablePresets = presets.filter(
    (p) => p.type === selectedElement.type && p.format === format
  );

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

        {/* --- PRESETS --- */}
        <div className={styles.formGroup}>
          <label className={styles.label}>✨ Presets</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              className={styles.input}
              placeholder="Nom du preset..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              onClick={() => {
                if (!presetName.trim()) return;
                savePreset(presetName.trim(), selectedElement, format);
                setPresetName('');
              }}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                padding: '0 0.5rem',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
              disabled={!presetName.trim()}
              title="Sauvegarder les propriétés actuelles comme preset"
            >
              💾
            </button>
          </div>

          {/* Preset Folders with Drag and Drop */}
          <div
            style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            {[
              { id: 'haut_gauche', label: '↖️ Haut Gauche' },
              { id: 'haut_droite', label: '↗️ Haut Droite' },
              { id: 'bas_gauche', label: '↙️ Bas Gauche' },
              { id: 'bas_droite', label: '↘️ Bas Droite' },
              { id: null, label: '📁 Non classé' },
            ].map((folderObj) => {
              const folderPresets = availablePresets.filter((p) =>
                folderObj.id === null ? !p.folder : p.folder === folderObj.id
              );

              const isExpanded =
                activeFolder === folderObj.id ||
                (folderObj.id === null && folderPresets.length > 0 && activeFolder === null);

              return (
                <div
                  key={folderObj.id || 'unclassified'}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const presetId = e.dataTransfer.getData('presetId');
                    if (presetId) {
                      movePresetToFolder(presetId, folderObj.id as any);
                    }
                  }}
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    overflow: 'hidden',
                    backgroundColor: 'white',
                  }}
                >
                  {/* Folder Header */}
                  <div
                    onClick={() => setActiveFolder(isExpanded ? null : folderObj.id)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#f9fafb',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                    }}
                  >
                    <span>{folderObj.label}</span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        padding: '0.1rem 0.4rem',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '1rem',
                      }}
                    >
                      {folderPresets.length}
                    </span>
                  </div>

                  {/* Folder Content */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '0.5rem',
                        display: 'flex',
                        gap: '0.25rem',
                        flexWrap: 'wrap',
                        minHeight: '3rem',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      {folderPresets.length === 0 ? (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            width: '100%',
                            textAlign: 'center',
                            padding: '0.5rem 0',
                            fontStyle: 'italic',
                          }}
                        >
                          Glissez un preset ici...
                        </div>
                      ) : (
                        folderPresets.map((preset) => (
                          <div
                            key={preset.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('presetId', preset.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.25rem',
                              overflow: 'hidden',
                              cursor: 'grab',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                          >
                            <button
                              onClick={() => applyPreset(preset, selectedElement.id)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#4b5563',
                              }}
                              title="Appliquer le preset"
                            >
                              {preset.name}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Supprimer le preset "${preset.name}" ?`)) {
                                  deletePreset(preset.id);
                                }
                              }}
                              style={{
                                padding: '0.25rem',
                                border: 'none',
                                borderLeft: '1px solid #d1d5db',
                                backgroundColor: '#fee2e2',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Supprimer le preset"
                            >
                              🗑️
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
              <label className={styles.label}>Police</label>
              <select
                className={styles.input}
                value={selectedElement.fontFamily || 'Arial'}
                onChange={(e) => handleChange('fontFamily', e.target.value)}
              >
                <optgroup label="Standard">
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                </optgroup>
                {customFonts && customFonts.length > 0 && (
                  <optgroup label="Mes Polices">
                    {customFonts.map((font) => (
                      <option key={font.id} value={font.name}>
                        {font.displayName || font.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontStyle: 'italic',
                }}
              >
                Gérez vos polices dans l'onglet <strong>Paramètres</strong> (nouveau menu à gauche).
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Style</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() =>
                    handleChange(
                      'fontWeight',
                      selectedElement.fontWeight === 'bold' ? 'normal' : 'bold'
                    )
                  }
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    backgroundColor: selectedElement.fontWeight === 'bold' ? '#dbeafe' : 'white',
                    border:
                      selectedElement.fontWeight === 'bold'
                        ? '1px solid #3b82f6'
                        : '1px solid #d1d5db',
                    color: selectedElement.fontWeight === 'bold' ? '#1e40af' : '#374151',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                  title="Gras"
                >
                  B
                </button>
                <button
                  onClick={() =>
                    handleChange(
                      'fontStyle',
                      selectedElement.fontStyle === 'italic' ? 'normal' : 'italic'
                    )
                  }
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    backgroundColor: selectedElement.fontStyle === 'italic' ? '#dbeafe' : 'white',
                    border:
                      selectedElement.fontStyle === 'italic'
                        ? '1px solid #3b82f6'
                        : '1px solid #d1d5db',
                    color: selectedElement.fontStyle === 'italic' ? '#1e40af' : '#374151',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontStyle: 'italic',
                  }}
                  title="Italique"
                >
                  I
                </button>
                <button
                  onClick={() =>
                    handleChange(
                      'textDecoration',
                      selectedElement.textDecoration === 'underline' ? 'none' : 'underline'
                    )
                  }
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    backgroundColor:
                      selectedElement.textDecoration === 'underline' ? '#dbeafe' : 'white',
                    border:
                      selectedElement.textDecoration === 'underline'
                        ? '1px solid #3b82f6'
                        : '1px solid #d1d5db',
                    color: selectedElement.textDecoration === 'underline' ? '#1e40af' : '#374151',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                  title="Souligné"
                >
                  U
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Alignement</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => handleChange('textAlign', 'left')}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    backgroundColor:
                      selectedElement.textAlign === 'left' || !selectedElement.textAlign
                        ? '#dbeafe'
                        : 'white',
                    border:
                      selectedElement.textAlign === 'left' || !selectedElement.textAlign
                        ? '1px solid #3b82f6'
                        : '1px solid #d1d5db',
                    color:
                      selectedElement.textAlign === 'left' || !selectedElement.textAlign
                        ? '#1e40af'
                        : '#374151',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Aligner à gauche"
                >
                  <AlignLeft size={16} />
                </button>
                <button
                  onClick={() => handleChange('textAlign', 'center')}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    backgroundColor: selectedElement.textAlign === 'center' ? '#dbeafe' : 'white',
                    border:
                      selectedElement.textAlign === 'center'
                        ? '1px solid #3b82f6'
                        : '1px solid #d1d5db',
                    color: selectedElement.textAlign === 'center' ? '#1e40af' : '#374151',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Centrer"
                >
                  <AlignCenter size={16} />
                </button>
                <button
                  onClick={() => handleChange('textAlign', 'right')}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    backgroundColor: selectedElement.textAlign === 'right' ? '#dbeafe' : 'white',
                    border:
                      selectedElement.textAlign === 'right'
                        ? '1px solid #3b82f6'
                        : '1px solid #d1d5db',
                    color: selectedElement.textAlign === 'right' ? '#1e40af' : '#374151',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Aligner à droite"
                >
                  <AlignRight size={16} />
                </button>
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
