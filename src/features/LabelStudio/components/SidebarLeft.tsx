'use client';
import React, { useRef } from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio } from '../context/LabelContext';
import { Plus, Printer, Trash2, ChevronDown, ChevronRight, Upload } from 'lucide-react';
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
    updateTriman,
  } = useLabelStudio();

  const fileInputRef = useRef<HTMLInputElement>(null);
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
                  }}
                  onClick={() => setActiveBatchId(batch.id)}
                >
                  <div className={styles.batchModel}>{batch.model}</div>
                  <div className={styles.batchMeta}>
                    Qté: {batch.quantity} • {batch.format}
                  </div>
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
    </aside>
  );
};

export default SidebarLeft;
