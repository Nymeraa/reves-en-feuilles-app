'use client';
import React, { useRef } from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio } from '../context/LabelContext';
import { Plus, Printer, Upload, Image as ImageIcon } from 'lucide-react';

const SidebarLeft: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    batches,
    activeBatchId,
    setActiveBatchId,
    setIsModalOpen,
    selectedLabelId,
    addElementToLabel,
  } = useLabelStudio();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLabelId) return;

    if (file.type === 'image/svg+xml' && file.name.endsWith('.svgz')) {
      alert('SVGZ format is not supported. Please use standard SVG.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newImage = {
        id: `img_${Date.now()}`,
        type: 'image' as const,
        content,
        x: 50,
        y: 50,
        width: 20, // Default 20mm
        height: 20,
        rotation: 0,
        scale: 1,
      };
      addElementToLabel(selectedLabelId, newImage);
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <aside className={styles.sidebarLeft}>
      <div className={styles.sidebarHeader}>
        <h1 className={styles.sidebarTitle}>Studio</h1>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!selectedLabelId ? (
              <div className={styles.emptyState}>
                Sélectionnez une étiquette pour ajouter des médias
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: '1rem',
                    border: '2px dashed #e5e7eb',
                    borderRadius: '0.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} color="#9ca3af" style={{ margin: '0 auto' }} />
                  <span
                    style={{
                      display: 'block',
                      marginTop: '0.5rem',
                      fontSize: '0.875rem',
                      color: '#4b5563',
                    }}
                  >
                    Importer une image
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/png, image/jpeg, image/svg+xml"
                    onChange={handleFileUpload}
                  />
                </div>

                <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
                  Formats supportés: JPG, PNG, SVG
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidebarLeft;
