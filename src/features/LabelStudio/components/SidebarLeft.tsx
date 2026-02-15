'use client';
import React, { useRef } from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio } from '../context/LabelContext';
import { Plus, Printer, Trash2, ChevronDown, ChevronRight, Upload, Settings } from 'lucide-react';
import { MediaCategory, MediaItem } from '../utils/db';

const SidebarLeft: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    batches,
    activeBatchId,
    activeBatchFormat,
    setActiveBatchId,
    setIsModalOpen,
    selectedLabelId,
    addElementToLabel,
    mediaLibrary,
    addMediaToLibrary,
    removeMediaFromLibrary,
    trimanConfig,
    customFonts,
    addCustomFont,
    deleteCustomFont,
  } = useLabelStudio();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = React.useState<MediaCategory | 'triman'>('logos');
  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({
    triman: true,
    logos: true,
    backgrounds: true,
    illustrations: true,
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    category: MediaCategory
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Safety check: must have active batch to know format
    if (!activeBatchId || !activeBatchFormat) {
      alert('Aucun lot sélectionné. Impossible de déterminer le format.');
      return;
    }

    if (file.type === 'image/svg+xml' && file.name.endsWith('.svgz')) {
      alert('SVGZ format is not supported. Please use standard SVG.');
      return;
    }

    try {
      await addMediaToLibrary(file, category, activeBatchFormat);
    } catch (error) {
      console.error('Upload failed', error);
      alert("Erreur lors de l'upload de l'image.");
    }

    // Reset input
    e.target.value = '';
  };

  const handleAddMediaToLabel = (item: MediaItem) => {
    if (!selectedLabelId) {
      alert("Veuillez sélectionner une étiquette dans le canvas d'abord.");
      return;
    }

    const newImage = {
      id: `img_${Date.now()}`,
      type: 'image' as const,
      content: item.data,
      x: 50,
      y: 50,
      width: 20, // Default 20mm
      height: 20,
      rotation: 0,
      scale: 1,
    };
    addElementToLabel(selectedLabelId, newImage);
  };

  const renderCategorySection = (title: string, category: MediaCategory) => {
    if (!activeBatchFormat) return null;

    // Filter by category AND format
    const items = mediaLibrary.filter(
      (m) => m.category === category && m.format === activeBatchFormat
    );
    const isExpanded = expandedCategories[category];

    return (
      <div className={styles.categorySection}>
        <div
          className={styles.categoryHeader}
          onClick={() => toggleCategory(category)}
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '0.5rem 0',
            fontWeight: 600,
            userSelect: 'none',
          }}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span style={{ marginLeft: '0.5rem' }}>
            {title} <span style={{ fontSize: '0.7em', color: '#999' }}>({activeBatchFormat})</span>
          </span>
        </div>

        {isExpanded && (
          <div className={styles.categoryContent}>
            <div
              className={styles.mediaGrid}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className={styles.mediaItem}
                  style={{
                    position: 'relative',
                    aspectRatio: '1/1',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    backgroundColor: '#fff',
                  }}
                >
                  <img
                    src={item.data}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onClick={() => handleAddMediaToLabel(item)}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMediaFromLibrary(item.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      background: 'rgba(255,255,255,0.8)',
                      padding: '2px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={12} color="red" />
                  </button>
                </div>
              ))}

              {/* Add Button */}
              <div
                style={{
                  aspectRatio: '1/1',
                  border: '1px dashed #e5e7eb',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f9fafb',
                }}
                onClick={() => {
                  setActiveCategory(category);
                  setTimeout(() => fileInputRef.current?.click(), 0);
                }}
                title={`Ajouter une image (${activeBatchFormat})`}
              >
                <Plus size={20} color="#9ca3af" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeTriman = activeBatchFormat ? trimanConfig[activeBatchFormat] : null;

  return (
    <aside className={styles.sidebarLeft}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Studio</h2>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'production' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('production')}
        >
          Production
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'media' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('media')}
        >
          Médias
        </button>
      </div>

      <div className={styles.sidebarContent}>
        {activeTab === 'production' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <button className={styles.buttonPrimary} onClick={() => setIsModalOpen(true)}>
                + Nouveau Lot
              </button>
            </div>
            {batches.length === 0 ? (
              <div className={styles.emptyState}>Aucun lot en cours</div>
            ) : (
              batches.map((batch) => (
                <div
                  key={batch.id}
                  className={styles.batchItem}
                  style={{
                    borderColor: activeBatchId === batch.id ? '#f59e0b' : '#e5e7eb',
                    backgroundColor: activeBatchId === batch.id ? '#fffbeb' : '#fff',
                    position: 'relative',
                  }}
                  onClick={() => setActiveBatchId(batch.id)}
                >
                  <div className={styles.batchModel}>{batch.model}</div>
                  <div className={styles.batchMeta}>
                    Format: {batch.format === 'small' ? 'Petit (2x4)' : 'Grand (2x2)'}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Supprimer le lot "${batch.model}" ?`)) {
                        deleteBatch(batch.id);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                    title="Supprimer ce lot"
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'media' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            {!activeBatchId ? (
              <div className={styles.emptyState}>
                Sélectionnez un lot dans l'onglet Production pour voir les médias associés à son
                format.
              </div>
            ) : (
              <>
                {/* Overlays Triman Section */}
                <div className={styles.categorySection}>
                  <div
                    className={styles.categoryHeader}
                    onClick={() => toggleCategory('triman')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '0.5rem 0',
                      fontWeight: 600,
                      userSelect: 'none',
                    }}
                  >
                    {expandedCategories['triman'] ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    <span style={{ marginLeft: '0.5rem' }}>
                      Overlays Triman ({activeBatchFormat})
                    </span>
                  </div>

                  {expandedCategories['triman'] && activeTriman && (
                    <div className={styles.categoryContent} style={{ paddingLeft: '1rem' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label
                          style={{
                            fontSize: '0.8rem',
                            display: 'block',
                            marginBottom: '0.25rem',
                            color: '#4b5563',
                          }}
                        >
                          Triman Global
                        </label>

                        {/* Triman Display / Upload */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div
                            style={{
                              width: '60px',
                              height: '60px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #eee',
                              borderRadius: '4px',
                              backgroundColor: '#f9f9f9',
                              overflow: 'hidden',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              setActiveCategory('triman');
                              setTimeout(() => fileInputRef.current?.click(), 0);
                            }}
                            title="Changer le Triman"
                          >
                            {activeTriman.url ? (
                              <img
                                src={activeTriman.url}
                                style={{ maxWidth: '100%', maxHeight: '100%' }}
                                alt="Triman"
                              />
                            ) : (
                              <span
                                style={{ fontSize: '0.7em', color: '#999', textAlign: 'center' }}
                              >
                                + Ajouter
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="checkbox"
                                checked={activeTriman.enabled}
                                onChange={(e) =>
                                  activeBatchFormat &&
                                  updateTriman(activeBatchFormat, { enabled: e.target.checked })
                                }
                              />
                              <span style={{ fontSize: '0.8rem' }}>Activé</span>
                            </div>

                            {activeTriman.enabled && (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Pos:</span>
                                <input
                                  type="number"
                                  placeholder="X"
                                  value={activeTriman.x}
                                  className={styles.input}
                                  style={{ width: '50px', padding: '2px 4px', fontSize: '0.75rem' }}
                                  onChange={(e) =>
                                    activeBatchFormat &&
                                    updateTriman(activeBatchFormat, {
                                      x: parseFloat(e.target.value),
                                    })
                                  }
                                />
                                <input
                                  type="number"
                                  placeholder="Y"
                                  value={activeTriman.y}
                                  className={styles.input}
                                  style={{ width: '50px', padding: '2px 4px', fontSize: '0.75rem' }}
                                  onChange={(e) =>
                                    activeBatchFormat &&
                                    updateTriman(activeBatchFormat, {
                                      y: parseFloat(e.target.value),
                                    })
                                  }
                                />
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>mm</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dynamic Categories */}
                {renderCategorySection('Logos', 'logos')}
                {renderCategorySection('Fonds / Cadres', 'backgrounds')}
                {renderCategorySection('Illustrations', 'illustrations')}

                {/* Hidden Input for Uploads */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/png, image/jpeg, image/svg+xml"
                  onChange={(e) => handleFileUpload(e, activeCategory as MediaCategory)}
                />
              </>
            )}
          </div>
        )}
      </div>
      {activeTab === 'settings' && (
        <div className={styles.sidebarContent}>
          <div className={styles.categorySection}>
            <div className={styles.categoryHeader}>
              <span className={styles.categoryTitle}>Gestion des Polices</span>
            </div>

            <div className={styles.categoryContent}>
              {/* Import Button */}
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="file"
                  accept=".ttf,.otf"
                  ref={fontInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      addCustomFont(file);
                      e.target.value = ''; // Reset input
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fontInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    backgroundColor: '#e5e7eb',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#374151',
                  }}
                >
                  <Upload size={14} />
                  Importer une police (.ttf/.otf)
                </button>
              </div>

              {/* Font List */}
              {customFonts && customFonts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {customFonts.map((font) => (
                    <div
                      key={font.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            color: '#111827',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {font.displayName || font.name}
                        </div>
                        <div
                          style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: font.name }}
                        >
                          Aperçu du texte 123
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer la police "${font.displayName || font.name}" ?`)) {
                            deleteCustomFont(font.id);
                          }
                        }}
                        style={{
                          padding: '0.25rem',
                          color: '#ef4444',
                          backgroundColor: '#fee2e2',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    textAlign: 'center',
                    padding: '1rem',
                  }}
                >
                  Aucune police personnalisée.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default SidebarLeft;
