const DB_NAME = "sharefast_cache";
const STORE_NAME = "files";

let memoryFile: File | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheActiveFile(file: File | null): Promise<void> {
  memoryFile = file;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    if (file) {
      tx.objectStore(STORE_NAME).put(file, "active_file");
    } else {
      tx.objectStore(STORE_NAME).delete("active_file");
    }
  } catch (err) {
    console.warn("Could not cache file in IndexedDB:", err);
  }
}

export async function getCachedActiveFile(): Promise<File | null> {
  if (memoryFile) return memoryFile;
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get("active_file");
      req.onsuccess = () => {
        const file = (req.result as File) || null;
        if (file) memoryFile = file;
        resolve(file);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export function getActiveFileInMemory(): File | null {
  return memoryFile;
}

/* ─── LifeDrop file cache ─── */

const lifeDropMemory = new Map<string, File>();

export async function cacheLifeDropFiles(entries: { id: string; file: File }[]): Promise<void> {
  entries.forEach((e) => lifeDropMemory.set(e.id, e.file));
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    entries.forEach((e) => store.put(e.file, `lifedrop_${e.id}`));
  } catch (err) {
    console.warn("Could not cache LifeDrop files in IndexedDB:", err);
  }
}

export async function getLifeDropFile(id: string): Promise<File | null> {
  if (lifeDropMemory.has(id)) return lifeDropMemory.get(id)!;
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(`lifedrop_${id}`);
      req.onsuccess = () => {
        const file = (req.result as File) || null;
        if (file) lifeDropMemory.set(id, file);
        resolve(file);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
