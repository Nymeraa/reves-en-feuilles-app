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
  images: any[]; // Placeholder
}

export interface Batch {
  id: string;
  model: string;
  quantity: number;
  format: 'small' | 'large';
  design: LabelDesign;
}

interface LabelContextType {
  batches: Batch[];
  activeBatchId: string | null;
  zoomLevel: number;
  activeTab: 'production' | 'media' | 'config';
  isModalOpen: boolean;
  addBatch: (batch: Omit<Batch, 'id' | 'design'>) => void;
  setActiveBatchId: (id: string) => void;
  setZoomLevel: (level: number) => void;
  setActiveTab: (tab: 'production' | 'media' | 'config') => void;
  setIsModalOpen: (isOpen: boolean) => void;
}

const LabelContext = createContext<LabelContextType | undefined>(undefined);

export const LabelProvider = ({ children }: { children: ReactNode }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeTab, setActiveTab] = useState<'production' | 'media' | 'config'>('production');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addBatch = (newBatch: Omit<Batch, 'id' | 'design'>) => {
    const id = Math.random().toString(36).substr(2, 9);

    // Mock Data Generation based on Model
    const mockDesign: LabelDesign = {
      backgroundColor: '#e8be6a', // Match request
      texts: [
        {
          id: 't1',
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

    const batch: Batch = {
      ...newBatch,
      id,
      design: mockDesign,
    };

    setBatches((prev) => [...prev, batch]);
    setActiveBatchId(id); // Auto-select new batch
    setIsModalOpen(false);
  };

  return (
    <LabelContext.Provider
      value={{
        batches,
        activeBatchId,
        zoomLevel,
        activeTab,
        isModalOpen,
        addBatch,
        setActiveBatchId,
        setZoomLevel,
        setActiveTab,
        setIsModalOpen,
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
