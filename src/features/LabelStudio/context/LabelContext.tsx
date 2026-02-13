'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define types for our domain
export interface LabelText {
  id: string;
  content: string;
  x: number; // Percentage or mm? Let's use % for simplicity relative to container
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

export interface LabelDesign {
  backgroundColor: string;
  texts: LabelText[];
  images: any[];
}

export interface LabelData {
  id: string; // Unique label ID (e.g., "batchId_labelIdx")
  design: LabelDesign;
}

export interface Batch {
  id: string;
  model: string;
  quantity: number;
  format: 'small' | 'large';
  labels: LabelData[]; // Array of independent label configs
}

interface LabelContextType {
  batches: Batch[];
  activeBatchId: string | null;
  selectedLabelId: string | null;
  selectedElementId: string | null;
  zoomLevel: number;
  activeTab: 'production' | 'media' | 'config';
  isModalOpen: boolean;
  addBatch: (batch: Omit<Batch, 'id' | 'labels'>) => void;
  setActiveBatchId: (id: string) => void;
  setSelectedLabelId: (id: string | null) => void;
  setSelectedElementId: (id: string | null) => void; // Keeps simple ID, but we might need labelId too later in Consumer
  setZoomLevel: (level: number) => void;
  setActiveTab: (tab: 'production' | 'media' | 'config') => void;
  setIsModalOpen: (isOpen: boolean) => void;
  updateLabelText: (labelId: string, textId: string, updates: Partial<LabelText>) => void;
}

const LabelContext = createContext<LabelContextType | undefined>(undefined);

export const LabelProvider = ({ children }: { children: ReactNode }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeTab, setActiveTab] = useState<'production' | 'media' | 'config'>('production');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addBatch = (newBatch: Omit<Batch, 'id' | 'labels'>) => {
    const batchId = Math.random().toString(36).substr(2, 9);

    // Master Design Template
    const masterDesign: LabelDesign = {
      backgroundColor: '#e8be6a',
      texts: [
        {
          id: 't1', // Template ID
          content: newBatch.model.toUpperCase(),
          x: 50,
          y: 40,
          fontSize: 16,
          color: '#000000',
          fontFamily: 'sans-serif',
        },
        {
          id: 't2',
          content: 'THÉ VERT BIO',
          x: 50,
          y: 55,
          fontSize: 10,
          color: '#333333',
          fontFamily: 'sans-serif',
        },
      ],
      images: [],
    };

    // Generate N independent labels
    const labels: LabelData[] = Array.from({ length: newBatch.quantity }).map((_, index) => {
      // Deep clone texts to ensure independence
      const clonedTexts = masterDesign.texts.map((t) => ({
        ...t,
        id: `text_${batchId}_${index}_${t.id}`,
      }));

      return {
        id: `label_${batchId}_${index}`,
        design: {
          ...masterDesign,
          texts: clonedTexts,
        },
      };
    });

    const batch: Batch = {
      ...newBatch,
      id: batchId,
      labels,
    };

    setBatches((prev) => [...prev, batch]);
    setActiveBatchId(batchId);
    setIsModalOpen(false);
  };

  const updateLabelText = (labelId: string, textId: string, updates: Partial<LabelText>) => {
    if (!activeBatchId) return;

    setBatches((prevBatches) =>
      prevBatches.map((batch) => {
        if (batch.id !== activeBatchId) return batch;

        return {
          ...batch,
          labels: batch.labels.map((label) => {
            if (label.id !== labelId) return label;

            return {
              ...label,
              design: {
                ...label.design,
                texts: label.design.texts.map((text) =>
                  text.id === textId ? { ...text, ...updates } : text
                ),
              },
            };
          }),
        };
      })
    );
  };

  return (
    <LabelContext.Provider
      value={{
        batches,
        activeBatchId,
        selectedLabelId,
        selectedElementId,
        zoomLevel,
        activeTab,
        isModalOpen,
        addBatch,
        setActiveBatchId,
        setSelectedLabelId,
        setSelectedElementId,
        setZoomLevel,
        setActiveTab,
        setIsModalOpen,
        updateLabelText,
      }}
    >
      {children}
    </LabelContext.Provider>
  );
};

export const useLabelStudio = () => {
  const context = useContext(LabelContext);
  if (context === undefined) {
    throw new Error('useLabelStudio must be used within a LabelProvider');
  }
  return context;
};
