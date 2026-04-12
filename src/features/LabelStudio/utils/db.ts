export type MediaCategory = 'triman' | 'logos' | 'backgrounds' | 'illustrations';
export type LabelFormat = 'small' | 'large';

export interface MediaItem {
  id: string;
  category: MediaCategory;
  format: LabelFormat;
  name: string;
  data: string; // Base64 DataURL
  timestamp: number;
}

const DB_NAME = 'LabelStudioDB';
const STORE_NAME = 'mediaLibrary';
const DB_VERSION = 7; // Increment version for element_presets support

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject('Error opening database');
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      } else {
        store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORE_NAME);
      }

      // Add format index if not exists (handling version upgrade)
      if (!store.indexNames.contains('format')) {
        store.createIndex('format', 'format', { unique: false });
      }

      // Create batches store
      if (!db.objectStoreNames.contains('batches')) {
        const batchStore = db.createObjectStore('batches', { keyPath: 'id' });
        batchStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create fonts store
      if (!db.objectStoreNames.contains('fonts')) {
        const fontStore = db.createObjectStore('fonts', { keyPath: 'id' });
        fontStore.createIndex('name', 'name', { unique: true });
      }

      // Create folders store
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
        folderStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Create templates store
      if (!db.objectStoreNames.contains('templates')) {
        const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
        templateStore.createIndex('folderId', 'folderId', { unique: false });
        templateStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      // Create element presets store
      if (!db.objectStoreNames.contains('element_presets')) {
        const presetStore = db.createObjectStore('element_presets', { keyPath: 'id' });
        presetStore.createIndex('type', 'type', { unique: false });
        presetStore.createIndex('format', 'format', { unique: false });
      }
    };
  });
};

// --- HYBRID CLOUD API HELPERS ---
const API_URL = '/api/label-studio/data';

const fetchCloudData = async (type: string): Promise<any[]> => {
  try {
    const res = await fetch(`${API_URL}?type=${type}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.error(`Failed to fetch ${type} from cloud:`, err);
  }
  return [];
};

const saveToCloud = async (type: string, data: any): Promise<boolean> => {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    });
    return res.ok;
  } catch (err) {
    console.error(`Failed to save ${type} to cloud:`, err);
    return false;
  }
};

const deleteFromCloud = async (type: string, id: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}?type=${type}&id=${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error(`Failed to delete ${type} from cloud:`, err);
    return false;
  }
};

// Helper: merge local and cloud arrays (deduplicate by id, prioritize cloud or newest timestamp)
const mergeHybridData = (localData: any[], cloudData: any[]): any[] => {
  const map = new Map<string, any>();

  // Add local first
  localData.forEach((item) => map.set(item.id, item));

  // Overwrite with cloud (cloud is source of truth if exists)
  cloudData.forEach((item) => map.set(item.id, item));

  return Array.from(map.values());
};

export const saveMedia = async (item: MediaItem): Promise<void> => {
  // 1. Save to Cloud
  await saveToCloud('media', item);

  // 2. Save locally (always as a fallback and offline cache)
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error saving media');
  });
};

export const deleteMedia = async (id: string): Promise<void> => {
  // 1. Delete from Cloud
  await deleteFromCloud('media', id);

  // 2. Delete locally
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error deleting media');
  });
};

export const getMediaByCategoryAndFormat = async (
  category: MediaCategory,
  format: LabelFormat
): Promise<MediaItem[]> => {
  const all = await getAllMedia();
  return all.filter((item) => item.category === category && item.format === format);
};

export const getAllMedia = async (): Promise<MediaItem[]> => {
  // 1. Fetch from Cloud
  const cloudMedia = await fetchCloudData('media');

  // 2. Fetch locally
  const db = await initDB();
  const localMedia = await new Promise<MediaItem[]>((resolve) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as MediaItem[]);
    request.onerror = () => resolve([]); // fallback empty array if local err
  });

  // 3. Merge & Sort
  const merged = mergeHybridData(localMedia, cloudMedia);

  return merged.sort((a, b) => b.timestamp - a.timestamp);
};

// Batch persistence
export interface BatchData {
  id: string;
  model: string;
  format: 'small' | 'large';
  poids: string;
  lot: string;
  ddm: string;
  labels: any[]; // Full label data structure
  timestamp: number;
}

const BATCH_STORE = 'batches';

export const saveBatch = async (batch: BatchData): Promise<void> => {
  await saveToCloud('batches', batch);

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BATCH_STORE], 'readwrite');
    const store = transaction.objectStore(BATCH_STORE);
    const request = store.put(batch);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error saving batch');
  });
};

export const deleteBatch = async (id: string): Promise<void> => {
  await deleteFromCloud('batches', id);

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BATCH_STORE], 'readwrite');
    const store = transaction.objectStore(BATCH_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error deleting batch');
  });
};

export const getAllBatches = async (): Promise<BatchData[]> => {
  let cloudBatches = await fetchCloudData('batches');
  
  // Parse stringified labels array from the cloud
  cloudBatches = cloudBatches.map(b => {
    if (typeof b.labels === 'string') {
      try {
        b.labels = JSON.parse(b.labels);
      } catch(e) {
        console.error('Failed to parse cloud batch labels', e);
        b.labels = [];
      }
    }
    return b;
  });

  const db = await initDB();
  const localBatches = await new Promise<BatchData[]>((resolve) => {
    const transaction = db.transaction([BATCH_STORE], 'readonly');
    const store = transaction.objectStore(BATCH_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as BatchData[]);
    request.onerror = () => resolve([]);
  });

  const merged = mergeHybridData(localBatches, cloudBatches);
  return merged.sort((a, b) => b.timestamp - a.timestamp);
};

// Font persistence
export interface FontItem {
  id: string;
  name: string;
  displayName: string; // Original name for UI
  data: string; // Base64 DataURL
  type: string; // font/ttf, font/otf, etc.
}

const FONT_STORE = 'fonts';

export const saveFont = async (font: FontItem): Promise<void> => {
  await saveToCloud('fonts', font);

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FONT_STORE], 'readwrite');
    const store = transaction.objectStore(FONT_STORE);
    const request = store.put(font);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error saving font');
  });
};

export const deleteFont = async (id: string): Promise<void> => {
  await deleteFromCloud('fonts', id);

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FONT_STORE], 'readwrite');
    const store = transaction.objectStore(FONT_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error deleting font');
  });
};

export const getAllFonts = async (): Promise<FontItem[]> => {
  const cloudFonts = await fetchCloudData('fonts');

  const db = await initDB();
  const localFonts = await new Promise<FontItem[]>((resolve) => {
    const transaction = db.transaction([FONT_STORE], 'readonly');
    const store = transaction.objectStore(FONT_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as FontItem[]);
    request.onerror = () => resolve([]);
  });

  return mergeHybridData(localFonts, cloudFonts);
};

// --- LIBRARY HELPERS (Folders & Templates) ---

export interface LibraryFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface LibraryTemplate {
  id: string;
  folderId: string | null; // null = root
  name: string;
  design: any; // LabelDesign (avoid circular dep if possible, or use any/interface clone)
  format: LabelFormat;
  side: 'front' | 'back';
  preview?: string; // Optional base64 preview
  createdAt: number;
}

export const createFolder = async (
  name: string,
  parentId: string | null = null
): Promise<LibraryFolder> => {
  const folder: LibraryFolder = {
    id: `folder_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random().toString(36).substr(2, 9)}`,
    name,
    parentId,
    createdAt: Date.now(),
  };

  await saveToCloud('folders', folder);

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['folders'], 'readwrite');
    const store = transaction.objectStore('folders');
    const request = store.add(folder);
    request.onsuccess = () => resolve(folder);
    request.onerror = () => reject('Error creating folder');
  });
};

export const getFolders = async (): Promise<LibraryFolder[]> => {
  const cloudFolders = await fetchCloudData('folders');

  const db = await initDB();
  const localFolders = await new Promise<LibraryFolder[]>((resolve) => {
    const transaction = db.transaction(['folders'], 'readonly');
    const store = transaction.objectStore('folders');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });

  return mergeHybridData(localFolders, cloudFolders);
};

export const deleteFolder = async (id: string): Promise<void> => {
  await deleteFromCloud('folders', id);

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['folders', 'templates'], 'readwrite');
    const folderStore = transaction.objectStore('folders');
    const templateStore = transaction.objectStore('templates');

    // 1. Delete folder
    folderStore.delete(id);

    // 2. Delete all templates in this folder
    const index = templateStore.index('folderId');
    const request = index.getAllKeys(id);

    request.onsuccess = () => {
      const keys = request.result;
      keys.forEach((key) => {
        templateStore.delete(key);
        // Fire and forget delete on cloud for templates
        deleteFromCloud('templates', key.toString());
      });
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject('Error deleting folder and contents');
  });
};

export const saveTemplate = async (template: LibraryTemplate): Promise<void> => {
  await saveToCloud('templates', template);

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['templates'], 'readwrite');
    const store = transaction.objectStore('templates');
    const request = store.put(template);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error saving template');
  });
};

export const getTemplates = async (): Promise<LibraryTemplate[]> => {
  let cloudTemplates = await fetchCloudData('templates');
  
  // Parse stringified design objects from the cloud
  cloudTemplates = cloudTemplates.map(t => {
    if (typeof t.design === 'string') {
      try { 
        t.design = JSON.parse(t.design); 
      } catch(e) {
        console.error('Failed to parse cloud template design', e);
      }
    }
    return t;
  });

  const db = await initDB();
  const localTemplates = await new Promise<LibraryTemplate[]>((resolve) => {
    const transaction = db.transaction(['templates'], 'readonly');
    const store = transaction.objectStore('templates');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });

  return mergeHybridData(localTemplates, cloudTemplates);
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await deleteFromCloud('templates', id);

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['templates'], 'readwrite');
    const store = transaction.objectStore('templates');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error deleting template');
  });
};

export const moveItem = async (
  itemId: string,
  type: 'folder' | 'template',
  targetFolderId: string | null
): Promise<void> => {
  const storeName = type === 'folder' ? 'folders' : 'templates';

  // 1. Fetch item from hybrid storage (Cloud + Local)
  const allItems = type === 'folder' ? await getFolders() : await getTemplates();
  const item = allItems.find(i => i.id === itemId);

  if (!item) {
    throw new Error('Item not found');
  }

  // 2. Update parent/folder location
  if (type === 'folder') {
    (item as LibraryFolder).parentId = targetFolderId;
  } else {
    (item as LibraryTemplate).folderId = targetFolderId;
  }

  // 3. Sync the move to Cloud
  saveToCloud(storeName, item).catch(err => console.error("Cloud sync failed on move:", err));

  // 4. Update or insert the updated item back into Local DB
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const putRequest = store.put(item);
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject('Error moving item locally');
  });
};

// --- ELEMENT PRESETS ---

export type PresetFolder = 'haut_gauche' | 'haut_droite' | 'bas_gauche' | 'bas_droite' | null;

export interface ElementPreset {
  id: string;
  name: string;
  type: 'text' | 'image' | 'illustration' | string;
  format: string;
  folder?: PresetFolder;
  properties: any; // Style/position properties (Partial<LabelElement>)
}

const PRESET_STORE = 'element_presets';

export const savePresetToDB = async (preset: ElementPreset): Promise<void> => {
  await saveToCloud('presets', preset);

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRESET_STORE], 'readwrite');
    const store = transaction.objectStore(PRESET_STORE);
    const request = store.put(preset);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error saving preset');
  });
};

export const deletePresetFromDB = async (id: string): Promise<void> => {
  await deleteFromCloud('presets', id);

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRESET_STORE], 'readwrite');
    const store = transaction.objectStore(PRESET_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error deleting preset');
  });
};

export const getAllPresets = async (): Promise<ElementPreset[]> => {
  let cloudPresets = await fetchCloudData('presets');
  
  // Parse stringified properties from the cloud
  cloudPresets = cloudPresets.map(p => {
    if (typeof p.properties === 'string') {
      try {
        p.properties = JSON.parse(p.properties);
      } catch(e) {
        console.error('Failed to parse cloud preset properties', e);
        p.properties = {};
      }
    }
    return p;
  });

  const db = await initDB();
  const localPresets = await new Promise<ElementPreset[]>((resolve) => {
    const transaction = db.transaction([PRESET_STORE], 'readonly');
    const store = transaction.objectStore(PRESET_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });

  return mergeHybridData(localPresets, cloudPresets);
};
