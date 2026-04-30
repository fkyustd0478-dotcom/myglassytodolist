// storage.js — Unified storage layer (global, no ES modules)
// Loaded before page-specific scripts on all pages.

const LapisStorage = {
    get(key, fallback = null) {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    },

    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    async sync() {
        return { mode: 'local-first', status: 'noop' };
    }
};

if (typeof window !== 'undefined') {
    window.LapisStorage = LapisStorage;
}

const StorageProvider = {
    // Todo page
    saveSettings: (s) => LapisStorage.set('todo_settings', s),
    loadSettings: () => LapisStorage.get('todo_settings', null),
    saveData: (d) => LapisStorage.set('todo_data', d),
    loadData: () => LapisStorage.get('todo_data', null),
    getTodoData: () => LapisStorage.get('todo_data', { todos: [] }),

    // Shift page
    saveShiftData: (d) => LapisStorage.set('glassy_shift_data', d),
    loadShiftData: () => LapisStorage.get('glassy_shift_data', null),
    getShiftData: () => LapisStorage.get('glassy_shift_data', {}),
    saveShiftSettings: (s) => LapisStorage.set('glassy_shift_settings', s),
    getShiftSettings: () => LapisStorage.get('glassy_shift_settings', {}),

    // Common settings (shared key between todo and shift)
    saveCommonSettings: (s) => LapisStorage.set('todo_settings', s),
    getCommonSettings: () => LapisStorage.get('todo_settings', {}),
};

// IndexedDB provider for blob storage (custom background images)
const ImageDB = {
    dbName: 'glassy-todo-blobs',
    storeName: 'images',
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            request.onerror = (e) => reject(e);
        });
    },

    async saveBlob(id, blob) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(blob, id);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    },

    async getBlob(id) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e);
        });
    },

    async deleteBlob(id) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }
};
