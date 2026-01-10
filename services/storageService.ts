
import { GalleryItem, FormData } from '../types';

const DB_NAME = 'EntalheImageStudioDB';
const DB_VERSION = 2; // Incremented version to support draft store
const GALLERY_STORE = 'gallery';
const DRAFT_STORE = 'draft';
const MAX_GALLERY_ITEMS = 10; // Limit gallery size to save space

/**
 * Inicializa o banco de dados IndexedDB
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(GALLERY_STORE)) {
        db.createObjectStore(GALLERY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE);
      }
    };
  });
};

/**
 * Salva a galeria no IndexedDB com limite de itens (FIFO)
 */
export const saveGalleryToDB = async (items: GalleryItem[]): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(GALLERY_STORE, 'readwrite');
  const store = tx.objectStore(GALLERY_STORE);

  // Keep only the latest N items to prevent QuotaExceededError
  const itemsToSave = items.slice(0, MAX_GALLERY_ITEMS);

  return new Promise((resolve, reject) => {
    store.clear().onsuccess = () => {
      for (const item of itemsToSave) {
        try {
          store.put(item);
        } catch (e) {
          console.error("Erro ao salvar item na galeria (provável limite de cota):", e);
          break;
        }
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Carrega todos os itens da galeria do IndexedDB
 */
export const loadGalleryFromDB = async (): Promise<GalleryItem[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(GALLERY_STORE, 'readonly');
    const store = tx.objectStore(GALLERY_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const items = request.result as GalleryItem[];
        resolve(items.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Erro ao carregar do IndexedDB:", error);
    return [];
  }
};

/**
 * Salva o rascunho do formulário no IndexedDB (suporta imagens grandes)
 */
export const saveDraftToDB = async (data: FormData): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(DRAFT_STORE, 'readwrite');
    const store = tx.objectStore(DRAFT_STORE);
    store.put(data, 'current_draft');
  } catch (e) {
    console.error("Erro ao salvar rascunho:", e);
  }
};

/**
 * Carrega o rascunho do formulário do IndexedDB
 */
export const loadDraftFromDB = async (): Promise<FormData | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(DRAFT_STORE, 'readonly');
    const store = tx.objectStore(DRAFT_STORE);
    const request = store.get('current_draft');

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

/**
 * Limpa todos os dados da galeria no banco
 */
export const clearGalleryDB = async (): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(GALLERY_STORE, 'readwrite');
  const store = tx.objectStore(GALLERY_STORE);
  store.clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
