// storage.js — Unified storage layer (global, no ES modules)
// Loaded before page-specific scripts on all pages.

const StorageProvider = {
    // Todo page
    saveSettings: (s) => localStorage.setItem('todo_settings', JSON.stringify(s)),
    loadSettings: () => JSON.parse(localStorage.getItem('todo_settings') || 'null'),
    saveData: (d) => localStorage.setItem('todo_data', JSON.stringify(d)),
    loadData: () => JSON.parse(localStorage.getItem('todo_data') || 'null'),
    getTodoData: () => JSON.parse(localStorage.getItem('todo_data') || '{"todos":[]}'),

    // Shift page
    saveShiftData: (d) => localStorage.setItem('glassy_shift_data', JSON.stringify(d)),
    loadShiftData: () => JSON.parse(localStorage.getItem('glassy_shift_data') || 'null'),
    getShiftData: () => JSON.parse(localStorage.getItem('glassy_shift_data') || '{}'),
    saveShiftSettings: (s) => localStorage.setItem('glassy_shift_settings', JSON.stringify(s)),
    getShiftSettings: () => JSON.parse(localStorage.getItem('glassy_shift_settings') || '{}'),

    // Common settings (shared key between todo and shift)
    saveCommonSettings: (s) => localStorage.setItem('todo_settings', JSON.stringify(s)),
    getCommonSettings: () => JSON.parse(localStorage.getItem('todo_settings') || '{}'),
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
