import TREE_DATA from './dummy/default.json';

const DB_NAME = 'file-manager-db';
const DB_VERSION = 3; // Incremented version for unified storage
const STORE_NAME = 'app-data';
const KEY = 'main-state';

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

type AppData = {
  tree: any[];
  scripts: Record<string, any>;
};

async function getAppData(): Promise<AppData> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(KEY);

    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        resolve(result);
      } else {
        resolve({ tree: TREE_DATA, scripts: {} });
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function saveAppData(data: AppData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, KEY);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getTreeData(): Promise<any[]> {
  const data = await getAppData();
  return data.tree;
}

export async function saveTreeData(tree: any[]): Promise<void> {
  const data = await getAppData();
  data.tree = tree;
  await saveAppData(data);
}

export async function getFileScript(fileId: string): Promise<any | null> {
  const data = await getAppData();
  return data.scripts[fileId] || null;
}

export async function saveFileScript(fileId: string, script: any): Promise<void> {
  const data = await getAppData();
  data.scripts[fileId] = script;
  await saveAppData(data);
}

export async function clearAllScripts(): Promise<void> {
  const data = await getAppData();
  data.scripts = {};
  await saveAppData(data);
}

export async function getFullData(): Promise<AppData> {
  return getAppData();
}

export async function saveFullData(data: AppData): Promise<void> {
  await saveAppData(data);
}
