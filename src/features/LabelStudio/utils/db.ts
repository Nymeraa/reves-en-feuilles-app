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
const DB_VERSION = 4; // Increment version for fonts store

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
    };
  });
};

export const saveMedia = async (item: MediaItem): Promise<void> => {
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
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = (request.result as MediaItem[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(results);
    };
    request.onerror = () => reject('Error fetching all media');
  });
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
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BATCH_STORE], 'readonly');
    const store = transaction.objectStore(BATCH_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = (request.result as BatchData[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(results);
    };
    request.onerror = () => reject('Error fetching batches');
  });
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
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FONT_STORE], 'readonly');
    const store = transaction.objectStore(FONT_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as FontItem[]);
    };
    request.onerror = () => reject('Error fetching fonts');
  });
};
