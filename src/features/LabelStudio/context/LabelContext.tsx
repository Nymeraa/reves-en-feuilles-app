'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  getAllMedia,
  saveMedia,
  deleteMedia as deleteMediaFromDB,
  MediaItem,
  MediaCategory,
  LabelFormat,
  getAllBatches,
  saveBatch as saveBatchToDB,
  deleteBatch as deleteBatchFromDB,
  BatchData,
  FontItem,
  saveFont,
  getAllFonts,
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
  backgroundImage?: string | null;
  elements: LabelElement[]; // Unified array for text & images
  triman: TrimanConfig;
}

export type LabelSide = 'front' | 'back';

export interface LabelData {
  id: string; // Unique label ID (e.g., "batchId_labelIdx")
  pairId: number; // Pair number (1-indexed)
  side: LabelSide; // 'front' or 'back'
  design: LabelDesign;
  backgroundColor?: string; // Background color for this label
  backgroundImage?: string | null; // Background image for this label
}

export interface Batch {
  id: string;
  model: string;
  format: 'small' | 'large';
  poids: string;
  lot: string;
  ddm: string;
  labels: LabelData[]; // Array of independent label configs
}

// Triman Config Interface
export interface TrimanSettings {
  url: string | null;
  x: number;
  y: number;
  enabled: boolean;
}

export interface GlobalTrimanConfig {
  small: TrimanSettings;
  large: TrimanSettings;
}

interface LabelContextType {
  batches: Batch[];
  activeBatchId: string | null;
  activeBatchFormat: 'small' | 'large' | null;
  selectedLabelId: string | null;
  selectedElementId: string | null;
  zoomLevel: number;
  activeTab: 'production' | 'media' | 'config';
  isModalOpen: boolean;
  trimanConfig: GlobalTrimanConfig;

  addBatch: (batch: Omit<Batch, 'id' | 'labels'>) => void;
  deleteBatch: (id: string) => Promise<void>;
  setActiveBatchId: (id: string) => void;
  setSelectedLabelId: (id: string | null) => void;
  setSelectedElementId: (id: string | null) => void;
  setZoomLevel: (level: number) => void;
  setActiveTab: (tab: 'production' | 'media' | 'config') => void;
  setIsModalOpen: (isOpen: boolean) => void;

  addElementToLabel: (labelId: string, element: LabelElement) => void;
  updateLabelElement: (labelId: string, elementId: string, updates: Partial<LabelElement>) => void;
  updateLabel: (labelId: string, updates: Partial<LabelData>) => void;
  removeElement: (labelId: string, elementId: string) => void;
  clearLabel: (labelId: string) => void;
  duplicateLabelDesign: (batchId: string, sourceLabelId: string) => void;
  duplicateSideDesign: (sourceLabelId: string) => void;
  saveAsDefaultTemplate: (
    format: 'small' | 'large',
    side: 'front' | 'back',
    elements: LabelElement[]
  ) => void;

  updateTriman: (format: 'small' | 'large', updates: Partial<TrimanSettings>) => void;

  mediaLibrary: MediaItem[];
  addMediaToLibrary: (
    file: File,
    category: MediaCategory,
    format: 'small' | 'large'
  ) => Promise<void>;
  removeMediaFromLibrary: (id: string) => Promise<void>;

  customFonts: FontItem[];
  addCustomFont: (file: File) => Promise<void>;
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

  // Global Triman State
  const [trimanConfig, setTrimanConfig] = useState<GlobalTrimanConfig>({
    small: { url: null, x: 5, y: 5, enabled: true },
    large: { url: null, x: 5, y: 5, enabled: true },
  });

  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [customFonts, setCustomFonts] = useState<FontItem[]>([]);

  // Derived state
  const activeBatch = batches.find((b) => b.id === activeBatchId);
  const activeBatchFormat = activeBatch?.format || null;

  // Load media and batches on mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        // Load media
        const items = await getAllMedia();
        setMediaLibrary(items);

        const trimanSmall = items.find((i) => i.category === 'triman' && i.format === 'small');
        const trimanLarge = items.find((i) => i.category === 'triman' && i.format === 'large');

        setTrimanConfig((prev) => ({
          small: { ...prev.small, url: trimanSmall ? trimanSmall.data : null },
          large: { ...prev.large, url: trimanLarge ? trimanLarge.data : null },
        }));

        // Load batches
        const savedBatches = await getAllBatches();
        if (savedBatches.length > 0) {
          setBatches(savedBatches as Batch[]);
        }

        // Load custom fonts
        const fonts = await getAllFonts();
        setCustomFonts(fonts);
        // Inject into document
        fonts.forEach((font) => {
          const fontFace = new FontFace(font.name, `url(${font.data})`);
          fontFace
            .load()
            .then((loadedFace) => {
              document.fonts.add(loadedFace);
            })
            .catch((err) => console.error('Error loading font:', font.name, err));
        });
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  // Auto-save batches whenever they change
  React.useEffect(() => {
    const saveBatches = async () => {
      try {
        for (const batch of batches) {
          await saveBatchToDB({ ...batch, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('Failed to save batches:', error);
      }
    };
    if (batches.length > 0) {
      saveBatches();
    }
  }, [batches]);

  const addCustomFont = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const fontData = e.target.result as string;
        // Remove file extension for name
        const fontName = file.name.replace(/\.[^/.]+$/, '');

        const font: FontItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: fontName,
          data: fontData,
          type: file.type,
        };

        try {
          // Inject
          const fontFace = new FontFace(fontName, `url(${fontData})`);
          const loadedFace = await fontFace.load();
          document.fonts.add(loadedFace);

          // Save
          await saveFont(font);
          setCustomFonts((prev) => [...prev, font]);
        } catch (err) {
          console.error('Failed to add font:', err);
          alert('Erreur lors du chargement de la police. Vérifiez que le fichier est valide.');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const addBatch = (newBatch: Omit<Batch, 'id' | 'labels'>) => {
    const batchId = Math.random().toString(36).substr(2, 9);

    const masterDesign: LabelDesign = {
      backgroundColor: '#ffffff',
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

    // Helper function to generate default elements based on label side
    const generateDefaultElements = (
      side: 'front' | 'back',
      labelId: string,
      batchData: { poids: string; lot: string; ddm: string },
      format: 'small' | 'large'
    ): LabelElement[] => {
      const storageKey = `template_${format}_${side}`;
      const savedTemplate = localStorage.getItem(storageKey);

      // Try to load from template
      if (savedTemplate) {
        try {
          const template = JSON.parse(savedTemplate);
          return template.map((t: any, idx: number) => {
            // Map idSuffix to content
            let content = '';
            if (t.idSuffix.includes('weight')) content = batchData.poids;
            else if (t.idSuffix === 'lot') content = 'Lot : ' + batchData.lot;
            else if (t.idSuffix === 'ddm') content = batchData.ddm;
            else if (t.idSuffix === 'weight_back') content = 'Poids net : ' + batchData.poids;
            else if (t.idSuffix === 'title') content = 'NOM DE LA RECETTE';
            else if (t.idSuffix === 'blend') content = 'Mélange de...';
            else if (t.idSuffix === 'tagline') content = "Une phrase d'accroche...";
            else if (t.idSuffix === 'desc') content = 'Description du produit...';
            else if (t.idSuffix === 'ingredients') content = 'Ingrédients : ...';
            else if (t.idSuffix === 'infusion') content = "Temps d'infusion : 3-5 min";
            else if (t.idSuffix === 'temp') content = 'Température : 90°C';
            else content = t.idSuffix; // Fallback

            return {
              id: `${labelId}_${t.idSuffix}`,
              type: t.type || 'text',
              content,
              x: t.x,
              y: t.y,
              rotation: t.rotation || 0,
              scale: t.scale || 1,
              locked: false,
              fontSize: t.fontSize || 10,
              fontFamily: t.fontFamily || 'Arial',
              color: '#6a3278', // Always violet
            };
          });
        } catch (e) {
          console.warn('Failed to load template, using defaults');
        }
      }

      // Default generation if no template
      const elements: LabelElement[] = [];
      const addText = (
        idSuffix: string,
        content: string,
        yPos: number,
        fontSize = 10,
        isBold = false
      ) => {
        elements.push({
          id: `${labelId}_${idSuffix}`,
          type: 'text',
          content,
          x: 10, // Marge gauche par défaut (10%)
          y: yPos,
          rotation: 0,
          scale: 1,
          locked: false,
          fontSize,
          fontFamily: 'Arial',
          color: '#6a3278', // Couleur violette par défaut
        });
      };

      if (side === 'front') {
        // ÉLÉMENTS DE LA FACE AVANT
        addText('weight_1', batchData.poids, 20, 10, true); // Poids 1 (en haut)
        addText('title', 'NOM DE LA RECETTE', 45, 14, true); // Y+20: 15→35→45
        addText('blend', 'Mélange de...', 60, 10); // Y+20: 30→50→60
        addText('weight_2', batchData.poids, 90, 10, true); // Poids 2 (en bas)
      } else {
        // ÉLÉMENTS DE LA FACE ARRIÈRE
        addText('tagline', "Une phrase d'accroche...", 30, 10, true); // Y+20: 10→30
        addText('desc', 'Description du produit...', 40, 9); // Y+20: 20→40
        addText('ingredients', 'Ingrédients : ...', 55, 8); // Y+20: 35→55
        addText('infusion', "Temps d'infusion : 3-5 min", 70, 8); // Y+20: 50→70
        addText('temp', 'Température : 90°C', 75, 8); // Y+20: 55→75
        addText('weight_back', 'Poids net : ' + batchData.poids, 85, 8); // Y+20: 65→85
        addText('lot', 'Lot : ' + batchData.lot, 90, 8); // Y+20: 70→90
        addText('ddm', batchData.ddm, 95, 8); // Y+20: 75→95 (sans préfixe)
      }

      return elements;
    };

    // On force la création d'une page complète quoi qu'il arrive
    const totalSlots = newBatch.format === 'small' ? 8 : 4;
    const labels: LabelData[] = [];

    for (let i = 0; i < totalSlots; i++) {
      let side: 'front' | 'back' = 'front';
      let pairId = 1;

      if (newBatch.format === 'small') {
        // 0, 1, 4, 5 sont l'arrière (back)
        const isBack = i === 0 || i === 1 || i === 4 || i === 5;
        side = isBack ? 'back' : 'front';

        // Paires : (0,2)=1, (1,3)=2, (4,6)=3, (5,7)=4
        if (i === 0 || i === 2) pairId = 1;
        else if (i === 1 || i === 3) pairId = 2;
        else if (i === 4 || i === 6) pairId = 3;
        else if (i === 5 || i === 7) pairId = 4;
      } else {
        side = i % 2 === 0 ? 'back' : 'front';
        pairId = Math.floor(i / 2) + 1;
      }

      const labelId = `label_${batchId}_${i}`;

      labels.push({
        id: labelId,
        pairId: pairId,
        side: side,
        design: {
          ...masterDesign,
          elements: generateDefaultElements(
            side,
            labelId,
            {
              poids: newBatch.poids,
              lot: newBatch.lot,
              ddm: newBatch.ddm,
            },
            newBatch.format
          ), // Pré-remplissage automatique
        },
        backgroundColor: '#ffffff', // Default white background
      });
    }

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

  const updateTriman = (format: 'small' | 'large', updates: Partial<TrimanSettings>) => {
    const newConfig = { ...trimanConfig, [format]: { ...trimanConfig[format], ...updates } };
    setTrimanConfig(newConfig);
  };

  const deleteBatch = async (id: string) => {
    try {
      await deleteBatchFromDB(id);
      setBatches((prev) => prev.filter((b) => b.id !== id));
      if (activeBatchId === id) {
        setActiveBatchId(null);
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
    }
  };

  const duplicateLabelDesign = (batchId: string, sourceLabelId: string) => {
    setBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== batchId) return batch;

        // Find the source label
        const sourceLabel = batch.labels.find((l) => l.id === sourceLabelId);
        if (!sourceLabel) return batch;

        // Deep clone the elements array to avoid reference issues
        const clonedElements = structuredClone(sourceLabel.design.elements);

        // Apply the cloned design to all other labels in the batch
        return {
          ...batch,
          labels: batch.labels.map((label) => ({
            ...label,
            design: {
              ...label.design,
              elements: structuredClone(clonedElements),
            },
          })),
        };
      })
    );
  };

  // Duplicate a label design to all labels with the same side (front/back) in the same batch
  const duplicateSideDesign = (sourceLabelId: string) => {
    if (!activeBatchId) return;

    setBatches((prevBatches) =>
      prevBatches.map((batch) => {
        if (batch.id !== activeBatchId) return batch;

        // Find the source label
        const sourceLabel = batch.labels.find((l) => l.id === sourceLabelId);
        if (!sourceLabel) return batch;

        const sourceSide = sourceLabel.side;

        // Copy design to all labels with the same side
        return {
          ...batch,
          labels: batch.labels.map((label) => {
            // Skip if it's the source label or different side
            if (label.id === sourceLabelId || label.side !== sourceSide) {
              return label;
            }

            // Deep clone the source elements with new IDs
            const clonedElements = structuredClone(sourceLabel.design.elements).map(
              (el: LabelElement) => ({
                ...el,
                id: `${label.id}_${el.id.split('_').pop()}`, // Generate new ID
              })
            );

            return {
              ...label,
              design: {
                ...label.design,
                elements: clonedElements,
              },
            };
          }),
        };
      })
    );
  };

  const addMediaToLibrary = async (file: File, category: MediaCategory, format: LabelFormat) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;

          if (category === 'triman') {
            const existing = mediaLibrary.find(
              (m) => m.category === 'triman' && m.format === format
            );
            if (existing) {
              await deleteMediaFromDB(existing.id);
            }
            updateTriman(format, { url: content });
          }

          const newItem: MediaItem = {
            id: `media_${Date.now()}`,
            category,
            format,
            name: file.name,
            data: content,
            timestamp: Date.now(),
          };
          await saveMedia(newItem);

          if (category === 'triman') {
            setMediaLibrary((prev) => [
              newItem,
              ...prev.filter((i) => !(i.category === 'triman' && i.format === format)),
            ]);
          } else {
            setMediaLibrary((prev) => [newItem, ...prev]);
          }

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

      const item = mediaLibrary.find((i) => i.id === id);
      if (item && item.category === 'triman') {
        setTrimanConfig((prev) => ({
          ...prev,
          [item.format]: { ...prev[item.format as 'small' | 'large'], url: null },
        }));
      }

      setMediaLibrary((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  };

  // Update label properties (like backgroundColor)
  const updateLabel = (labelId: string, updates: Partial<LabelData>) => {
    if (!activeBatchId) return;
    setBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== activeBatchId) return batch;
        return {
          ...batch,
          labels: batch.labels.map((label) =>
            label.id === labelId ? { ...label, ...updates } : label
          ),
        };
      })
    );
  };

  // Remove an element from a label
  const removeElement = (labelId: string, elementId: string) => {
    if (!activeBatchId) return;
    setBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== activeBatchId) return batch;
        return {
          ...batch,
          labels: batch.labels.map((label) => {
            if (label.id !== labelId) return label;
            return {
              ...label,
              design: {
                ...label.design,
                elements: label.design.elements.filter((el) => el.id !== elementId),
              },
            };
          }),
        };
      })
    );
    setSelectedElementId(null);
  };

  // Clear all elements from a label
  const clearLabel = (labelId: string) => {
    if (!activeBatchId) return;
    setBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== activeBatchId) return batch;
        return {
          ...batch,
          labels: batch.labels.map((label) =>
            label.id === labelId
              ? {
                  ...label,
                  design: { ...label.design, elements: [] },
                  backgroundColor: '#ffffff', // Reset to white
                  backgroundImage: undefined, // Remove any background image
                }
              : label
          ),
        };
      })
    );
    setSelectedElementId(null);
  };

  // Save current label elements as default template for a specific format/side combination
  const saveAsDefaultTemplate = (
    format: 'small' | 'large',
    side: 'front' | 'back',
    elements: LabelElement[]
  ) => {
    const storageKey = `template_${format}_${side}`;
    // Save only style/position, not content
    const template = elements.map((el) => ({
      idSuffix: el.id.split('_').pop() || 'unknown',
      type: el.type,
      x: el.x,
      y: el.y,
      rotation: el.rotation,
      scale: el.scale,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      color: el.color,
    }));
    localStorage.setItem(storageKey, JSON.stringify(template));
  };

  return (
    <LabelContext.Provider
      value={{
        batches,
        activeBatchId,
        activeBatchFormat,
        selectedLabelId,
        selectedElementId,
        zoomLevel,
        activeTab,
        isModalOpen,
        trimanConfig,
        addBatch,
        deleteBatch,
        setActiveBatchId,
        setSelectedLabelId,
        setSelectedElementId,
        setZoomLevel,
        setActiveTab,
        setIsModalOpen,
        updateLabelElement,
        addElementToLabel,
        updateLabel,
        removeElement,
        clearLabel,
        duplicateLabelDesign,
        duplicateSideDesign,
        saveAsDefaultTemplate,
        updateTriman,
        mediaLibrary,
        addMediaToLibrary,
        removeMediaFromLibrary,
        customFonts,
        addCustomFont,
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
