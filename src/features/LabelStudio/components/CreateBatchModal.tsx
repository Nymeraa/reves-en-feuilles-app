'use client';
import React, { useState } from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio, Batch } from '../context/LabelContext';

const CreateBatchModal: React.FC = () => {
  const { isModalOpen, setIsModalOpen, addBatch } = useLabelStudio();
  const [model, setModel] = useState('Jardin Sauvage');
  const [quantity, setQuantity] = useState(8);
  const [format, setFormat] = useState<'small' | 'large'>('small');

  if (!isModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBatch({
      model,
      quantity,
      format,
    });
    // Reset defaults for next time
    setQuantity(8);
    setFormat('small');
  };

  return (
    <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Ajouter un lot d'étiquettes</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Modèle</label>
            <select
              className={styles.select}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="Jardin Sauvage">Jardin Sauvage</option>
              <option value="Nuit d'Orient">Nuit d'Orient</option>
              <option value="Earl Grey Royal">Earl Grey Royal</option>
              <option value="Menthe Fraîche">Menthe Fraîche</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Quantité</label>
            <input
              type="number"
              className={styles.input}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              min="1"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Format</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="format"
                  checked={format === 'small'}
                  onChange={() => setFormat('small')}
                />
                Petit (≤50g) - Grille 2x4 (8/page)
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="format"
                  checked={format === 'large'}
                  onChange={() => setFormat('large')}
                />
                Grand {'>'}50g - Grille 2x2 (4/page)
              </label>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.buttonSecondary}
              style={{ width: 'auto' }}
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </button>
            <button type="submit" className={styles.buttonPrimary} style={{ width: 'auto' }}>
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBatchModal;
