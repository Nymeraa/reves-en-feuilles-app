
const DB_NAME = 'TeaLabelStudioDB';
const DB_VERSION = 1;
const STORE_MEDIA = 'media';
const STORE_TEMPLATES = 'templates';

export interface DBMediaItem {
    id: string;
    name: string;
    type: string;
    data: string; // Base64 DataURL
    createdAt: number;
}

export interface DBTemplateItem {
    id: string;
    name: string;
    format: 'A' | 'B';
    data: any; // Full state dump
    createdAt: number;
}

class IndexedDBHelper {
    private db: IDBDatabase | null = null;

    async init() {
        if (this.db) return;

        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_MEDIA)) {
                    db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
                    db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
                }
            };
        });
    }

    async saveMedia(item: DBMediaItem): Promise<void> {
        await this.init();
        return this.put(STORE_MEDIA, item);
    }

    async getMediaAll(): Promise<DBMediaItem[]> {
        await this.init();
        return this.getAll(STORE_MEDIA);
    }

    async deleteMedia(id: string): Promise<void> {
        await this.init();
        return this.delete(STORE_MEDIA, id);
    }

    async saveTemplate(item: DBTemplateItem): Promise<void> {
        await this.init();
        return this.put(STORE_TEMPLATES, item);
    }

    async getTemplates(): Promise<DBTemplateItem[]> {
        await this.init();
        return this.getAll(STORE_TEMPLATES);
    }

    // Generic Methods
    private async put(storeName: string, item: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(item);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    private async getAll<T>(storeName: string): Promise<T[]> {
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    private async delete(storeName: string, id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
}

export const dbHelper = new IndexedDBHelper();
