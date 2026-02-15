'use client';
import React, { useRef } from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio } from '../context/LabelContext';
import {
  Plus,
  Printer,
  Trash2,
  ChevronDown,
  ChevronRight,
  Upload,
  Settings,
  Library,
  Folder,
  FileText,
  Save,
} from 'lucide-react';
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
    deleteBatch,
    customFonts,
    addCustomFont,
    deleteCustomFont,
    libraryFolders,
    libraryTemplates,
    addFolder,
    removeFolder,
    saveCurrentDesignAsTemplate,
    applyTemplateToLabel,
    removeTemplate,
    moveItem,
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

  // Library Local State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [newTemplateName, setNewTemplateName] = React.useState('');
  const [selectedFolderForSave, setSelectedFolderForSave] = React.useState<string>('root');
  const [openFolders, setOpenFolders] = React.useState<Record<string, boolean>>({});

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
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
        <button
          className={`${styles.tab} ${activeTab === 'library' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('library')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Library size={14} />
          Biblio
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('settings')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Settings size={14} />
          Paramètres
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
      {activeTab === 'library' && (
        <div
          className={styles.sidebarContent}
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* 1. Fixed Header: Search & Save */}
          <div
            style={{
              padding: '0.5rem',
              borderBottom: '1px solid #e5e7eb',
              flexShrink: 0,
              backgroundColor: '#fff',
            }}
          >
            {/* Search Bar */}
            <input
              type="text"
              placeholder="🔍 Rechercher un modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.input}
              style={{ width: '100%', marginBottom: '0.75rem' }}
            />

            {/* Save Section */}
            <div className={styles.categoryHeader}>
              <span className={styles.categoryTitle}>Nouveau Modèle</span>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder="Nom du modèle"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className={styles.input}
                style={{ flex: 1, minWidth: 0 }}
              />
              <button
                onClick={() => {
                  if (!newTemplateName.trim()) return alert('Nom du modèle requis');
                  const folderId = selectedFolderForSave === 'root' ? null : selectedFolderForSave;
                  saveCurrentDesignAsTemplate(newTemplateName, folderId);
                  setNewTemplateName('');
                }}
                className={styles.buttonPrimary}
                style={{
                  width: '40px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                title="Sauvegarder"
              >
                <Save size={16} />
              </button>
            </div>

            <select
              className={styles.input}
              value={selectedFolderForSave}
              onChange={(e) => setSelectedFolderForSave(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="root">📁 (Racine)</option>
              {libraryFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Scrollable Tree Area */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'bold' }}>
                Bibliothèque
              </span>
              <button
                onClick={() => {
                  const name = prompt('Nom du nouveau dossier ?');
                  if (name) addFolder(name);
                }}
                style={{
                  background: 'none',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={12} /> Dossier
              </button>
            </div>

            <LibraryTree
              folders={libraryFolders}
              templates={libraryTemplates}
              moveItem={moveItem}
              removeFolder={removeFolder}
              removeTemplate={removeTemplate}
              applyTemplateToLabel={applyTemplateToLabel}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      )}

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

interface LibraryTreeProps {
  folders: any[];
  templates: any[];
  moveItem: (itemId: string, type: 'folder' | 'template', targetFolderId: string | null) => void;
  removeFolder: (id: string) => void;
  removeTemplate: (id: string) => void;
  applyTemplateToLabel: (id: string) => void;
  searchQuery?: string;
}

function LibraryTree({
  folders,
  templates,
  moveItem,
  removeFolder,
  removeTemplate,
  applyTemplateToLabel,
  searchQuery = '',
}: LibraryTreeProps) {
  // Safety check
  if (!Array.isArray(folders) || !Array.isArray(templates)) {
    return <div style={{ padding: '1rem', color: 'red' }}>Erreur de chargement des données.</div>;
  }

  const handleDragStart = (e: React.DragEvent, id: string, type: 'folder' | 'template') => {
    e.dataTransfer.setData('itemId', id);
    e.dataTransfer.setData('itemType', type);
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.dataTransfer.getData('itemId');
    const itemType = e.dataTransfer.getData('itemType') as 'folder' | 'template';

    if (itemId && itemType) {
      console.log(`Moving ${itemType} ${itemId} to folder ${targetFolderId}`);
      moveItem(itemId, itemType, targetFolderId);
    }
  };

  // --- SEARCH VIEW (FLAT LIST) ---
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    const matchingFolders = folders.filter((f) => f.name.toLowerCase().includes(query));
    const matchingTemplates = templates.filter((t) => t.name.toLowerCase().includes(query));

    if (matchingFolders.length === 0 && matchingTemplates.length === 0) {
      return (
        <div
          style={{ padding: '1rem', color: '#9ca3af', textAlign: 'center', fontSize: '0.85rem' }}
        >
          Aucun résultat pour "{searchQuery}"
        </div>
      );
    }

    return (
      <div style={{ paddingBottom: '1rem' }}>
        {matchingFolders.map((folder) => (
          <div
            key={folder.id}
            style={{
              padding: '6px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Folder size={14} fill="#fcd34d" color="#d97706" />
              <span style={{ fontSize: '0.85rem' }}>{folder.name}</span>
            </div>
            <button
              onClick={() => removeFolder(folder.id)}
              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Trash2 size={12} color="#9ca3af" />
            </button>
          </div>
        ))}
        {matchingTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => applyTemplateToLabel(template.id)}
            style={{
              padding: '6px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} color="#6b7280" />
              <span style={{ fontSize: '0.85rem' }}>{template.name}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTemplate(template.id);
              }}
              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Trash2 size={12} color="#ef4444" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  // --- TREE VIEW (RECURSIVE) ---
  const renderFolder = (folder: any) => {
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const childTemplates = templates.filter((t) => t.folderId === folder.id);
    // Use simple state for open/close. Ideally this should be persisted or lifted, but local is fine for now.
    // To prevent "all closed by default" annoyance, maybe default open? No, closed is standard.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <div
        key={folder.id}
        draggable
        onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, folder.id)}
        style={{
          marginLeft: '0.5rem',
          borderLeft: '1px solid #e5e7eb',
          paddingLeft: '0.25rem',
          marginTop: '0.25rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={14} fill="#fcd34d" color="#d97706" />
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{folder.name}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFolder(folder.id);
            }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }}
          >
            <Trash2 size={12} color="#9ca3af" />
          </button>
        </div>

        {isOpen && (
          <div>
            {childFolders.map(renderFolder)}
            {childTemplates.map((template: any) => (
              <div
                key={template.id}
                draggable
                onDragStart={(e) => handleDragStart(e, template.id, 'template')}
                onClick={() => applyTemplateToLabel(template.id)}
                style={{
                  padding: '4px 8px',
                  margin: '2px 0 2px 0.5rem',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'grab',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={12} color="#6b7280" />
                  <span>{template.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTemplate(template.id);
                  }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <Trash2 size={12} color="#ef4444" />
                </button>
              </div>
            ))}
            {childFolders.length === 0 && childTemplates.length === 0 && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  padding: '4px 0 4px 1rem',
                  fontStyle: 'italic',
                }}
              >
                (Vide)
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter((f) => !f.parentId);
  const rootTemplates = templates.filter((t) => !t.folderId);

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, null)}
      style={{ minHeight: '100px', paddingBottom: '2rem' }}
    >
      {rootFolders.map(renderFolder)}
      {rootTemplates.map((template) => (
        <div
          key={template.id}
          draggable
          onDragStart={(e) => handleDragStart(e, template.id, 'template')}
          onClick={() => applyTemplateToLabel(template.id)}
          style={{
            padding: '6px',
            margin: '4px 0',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '0.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'grab',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} color="#6b7280" />
            <span>{template.name}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTemplate(template.id);
            }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }}
          >
            <Trash2 size={14} color="#ef4444" />
          </button>
        </div>
      ))}
      {rootFolders.length === 0 && rootTemplates.length === 0 && (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
          La bibliothèque est vide.
          <br />
          Sauvegardez un design ou créez un dossier !
        </div>
      )}
    </div>
  );
}

export default SidebarLeft;
