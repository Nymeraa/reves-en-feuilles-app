'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  getAllMedia,
  saveMedia,
  deleteMedia as deleteMediaFromDB,
  MediaItem,
  MediaCategory,
} from '../utils/db';

// Define types for our domain
export type ElementType = 'text' | 'image';

export interface LabelElement {
  id: string;
  type: ElementType;
  content: string; // Text content or Image URL (base64/blob)
  x: number; // %
  y: number; // %
  width?: number; // mm (for images)
  height?: number; // mm (for images)
  rotation: number; // deg
  scale: number; // 1 = 100%
  fontSize?: number; // px (text only)
  color?: string; // (text only)
  fontFamily?: string; // (text only)
  locked?: boolean;
}

export interface TrimanConfig {
  enabled: boolean;
  x: number; // mm
  y: number; // mm
  format: 'market' | 'standard'; // Example specific prop
}

export interface LabelDesign {
  backgroundColor: string;
  elements: LabelElement[]; // Unified array for text & images
  triman: TrimanConfig;
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
  addElementToLabel: (labelId: string, element: LabelElement) => void;
  updateTriman: (labelId: string, updates: Partial<TrimanConfig>) => void;
  updateLabelElement: (labelId: string, elementId: string, updates: Partial<LabelElement>) => void;
  mediaLibrary: MediaItem[];
  addMediaToLibrary: (file: File, category: MediaCategory) => Promise<void>;
  removeMediaFromLibrary: (id: string) => Promise<void>;
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
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);

  // Load media on mount
  React.useEffect(() => {
    const loadMedia = async () => {
      try {
        const items = await getAllMedia();
        setMediaLibrary(items);
      } catch (error) {
        console.error('Failed to load media library:', error);
      }
    };
    loadMedia();
  }, []);

  const addBatch = (newBatch: Omit<Batch, 'id' | 'labels'>) => {
    const batchId = Math.random().toString(36).substr(2, 9);

    // Master Design Template
    // Master Design Template
    const masterDesign: LabelDesign = {
      backgroundColor: '#e8be6a',
      triman: { enabled: false, x: 5, y: 5, format: 'standard' },
      elements: [
        {
          id: 't1',
          type: 'text',
          content: newBatch.model.toUpperCase(),
          x: 50,
          y: 40,
          fontSize: 16,
          color: '#000000',
          fontFamily: 'sans-serif',
          rotation: 0,
          scale: 1,
        },
        {
          id: 't2',
          type: 'text',
          content: 'THÉ VERT BIO',
          x: 50,
          y: 55,
          fontSize: 10,
          color: '#333333',
          fontFamily: 'sans-serif',
          rotation: 0,
          scale: 1,
        },
      ],
    };

    // Generate N independent labels
    const labels: LabelData[] = Array.from({ length: newBatch.quantity }).map((_, index) => {
      // Deep clone elements
      const clonedElements = masterDesign.elements.map((el) => ({
        ...el,
        id: `el_${batchId}_${index}_${el.id}`,
      }));

      return {
        id: `label_${batchId}_${index}`,
        design: {
          ...masterDesign,
          elements: clonedElements,
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

  const updateLabelElement = (
    labelId: string,
    elementId: string,
    updates: Partial<LabelElement>
  ) => {
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
                elements: label.design.elements.map((el) =>
                  el.id === elementId ? { ...el, ...updates } : el
                ),
              },
            };
          }),
        };
      })
    );
  };

  const addElementToLabel = (labelId: string, element: LabelElement) => {
    if (!activeBatchId) return;
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== activeBatchId) return b;
        return {
          ...b,
          labels: b.labels.map((l) => {
            if (l.id !== labelId) return l;
            return {
              ...l,
              design: {
                ...l.design,
                elements: [...l.design.elements, element],
              },
            };
          }),
        };
      })
    );
  };

  const updateTriman = (labelId: string, updates: Partial<TrimanConfig>) => {
    if (!activeBatchId) return;
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== activeBatchId) return b;
        return {
          ...b,
          labels: b.labels.map((l) => {
            if (l.id !== labelId) return l;
            return {
              ...l,
              design: {
                ...l.design,
                triman: { ...l.design.triman, ...updates },
              },
            };
          }),
        };
      })
    );
  };

  const addMediaToLibrary = async (file: File, category: MediaCategory) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const newItem: MediaItem = {
            id: `media_${Date.now()}`,
            category,
            name: file.name,
            data: content,
            timestamp: Date.now(),
          };
          await saveMedia(newItem);
          setMediaLibrary((prev) => [newItem, ...prev]);
          resolve();
        } catch (err) {
          console.error('Error saving media:', err);
          reject(err);
        }
      };
      reader.onerror = () => reject('Error reading file');
      reader.readAsDataURL(file);
    });
  };

  const removeMediaFromLibrary = async (id: string) => {
    try {
      await deleteMediaFromDB(id);
      setMediaLibrary((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting media:', error);
    }
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
        updateLabelElement,
        addElementToLabel,
        updateTriman,
        mediaLibrary,
        addMediaToLibrary,
        removeMediaFromLibrary,
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
