'use client';
import React, { useState, useEffect } from 'react';
import styles from '../LabelStudio.module.css';
import { useLabelStudio, Batch } from '../context/LabelContext';

const CreateBatchModal: React.FC = () => {
  const { isModalOpen, setIsModalOpen, addBatch } = useLabelStudio();
  const [batchName, setBatchName] = useState('');
  const [poids, setPoids] = useState('50g');
  const [lot, setLot] = useState('');
  const [ddm, setDdm] = useState('');
  const [infusion, setInfusion] = useState('3-5 min');
  const [temp, setTemp] = useState('90°C');
  const [format, setFormat] = useState<'small' | 'large'>('small');

  // Load last values from localStorage on mount
  useEffect(() => {
    const lastPoids = localStorage.getItem('lastPoids');
    const lastLot = localStorage.getItem('lastLot');
    const lastDdm = localStorage.getItem('lastDdm');
    if (lastPoids) setPoids(lastPoids);
    if (lastLot) setLot(lastLot);
    if (lastDdm) setDdm(lastDdm);
    const lastInfusion = localStorage.getItem('lastInfusion');
    const lastTemp = localStorage.getItem('lastTemp');
    if (lastInfusion) setInfusion(lastInfusion);
    if (lastTemp) setTemp(lastTemp);
  }, []);

  if (!isModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Save values to localStorage
    localStorage.setItem('lastPoids', poids);
    localStorage.setItem('lastLot', lot);
    localStorage.setItem('lastDdm', ddm);
    localStorage.setItem('lastInfusion', infusion);
    localStorage.setItem('lastTemp', temp);

    addBatch({
      model: batchName || 'Nouveau Lot', // Use user input or default name
      format,
      poids,
      lot,
      ddm,
      infusion,
      temp,
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Ajouter un lot d'étiquettes</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nom du lot</label>
            <input
              type="text"
              className={styles.input}
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Ex: Thé Vert Menthe"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Poids</label>
            <input
              type="text"
              className={styles.input}
              value={poids}
              onChange={(e) => setPoids(e.target.value)}
              placeholder="Ex: 50g"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Lot</label>
            <input
              type="text"
              className={styles.input}
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              placeholder="Numéro de lot"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>DDM</label>
            <input
              type="text"
              className={styles.input}
              value={ddm}
              onChange={(e) => setDdm(e.target.value)}
              placeholder="Date de durabilité minimale"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Infusion</label>
              <input
                type="text"
                className={styles.input}
                value={infusion}
                onChange={(e) => setInfusion(e.target.value)}
                placeholder="Ex: 3-5 min"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Température</label>
              <input
                type="text"
                className={styles.input}
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                placeholder="Ex: 90°C"
              />
            </div>
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
