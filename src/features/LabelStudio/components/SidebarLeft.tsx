'use client';
import React from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio } from '../context/LabelContext';
import { Plus, Printer } from 'lucide-react';

const SidebarLeft: React.FC = () => {
  const { activeTab, setActiveTab, setIsModalOpen, batches } = useLabelStudio();

  return (
    <aside className={styles.sidebarLeft}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Tea Label Studio</h2>
      </div>

      <nav className={styles.tabs}>
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
          className={`${styles.tab} ${activeTab === 'config' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Config
        </button>
      </nav>

      <div className={styles.sidebarContent}>
        {activeTab === 'production' && (
          <>
            {batches.length === 0 ? (
              <div className={styles.emptyState}>Aucun lot en cours</div>
            ) : (
              <div className="space-y-2">
                {batches.map((batch) => (
                  <div key={batch.id} className={styles.batchItem}>
                    <div className={styles.batchModel}>{batch.model}</div>
                    <div className={styles.batchMeta}>
                      Qty: {batch.quantity} • Format: {batch.format === 'small' ? 'Petit' : 'Grand'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {activeTab !== 'production' && <div className={styles.emptyState}>Bientôt disponible</div>}
      </div>

      <div className={styles.sidebarFooter}>
        <button className={styles.buttonPrimary} onClick={() => setIsModalOpen(true)}>
          <span
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Plus size={16} /> Ajouter un lot
          </span>
        </button>
        <button className={styles.buttonSecondary}>
          <span
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Printer size={16} /> Imprimer
          </span>
        </button>
      </div>
    </aside>
  );
};

export default SidebarLeft;
