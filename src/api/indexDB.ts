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

type SectionData = {
  tree: any[];
  scripts: Record<string, any>;
};

type AppData = SectionData & {
  sections?: Record<string, SectionData>;
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
        resolve(TREE_DATA as AppData);
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

export async function getTreeData(section?: string): Promise<any[]> {
  const data = await getAppData();
  if (!section || section === 'main') return data.tree;
  return data.sections?.[section]?.tree || [];
}

export async function saveTreeData(tree: any[], section?: string): Promise<void> {
  const data = await getAppData();
  if (!section || section === 'main') {
    data.tree = tree;
  } else {
    if (!data.sections) data.sections = {};
    if (!data.sections[section]) data.sections[section] = { tree: [], scripts: {} };
    data.sections[section].tree = tree;
  }
  await saveAppData(data);
}

export async function getFileScript(fileId: string, section?: string): Promise<any | null> {
  const data = await getAppData();
  if (!section || section === 'main') return data.scripts[fileId] || null;
  return data.sections?.[section]?.scripts[fileId] || null;
}

export async function saveFileScript(fileId: string, script: any, section?: string): Promise<void> {
  const data = await getAppData();
  if (!section || section === 'main') {
    data.scripts[fileId] = script;
  } else {
    if (!data.sections) data.sections = {};
    if (!data.sections[section]) data.sections[section] = { tree: [], scripts: {} };
    data.sections[section].scripts[fileId] = script;
  }
  await saveAppData(data);
}

export async function clearAllScripts(section?: string): Promise<void> {
  const data = await getAppData();
  if (!section || section === 'main') {
    data.scripts = {};
  } else if (data.sections?.[section]) {
    data.sections[section].scripts = {};
  }
  await saveAppData(data);
}

export async function getFullData(): Promise<AppData> {
  return getAppData();
}

export async function saveFullData(data: AppData): Promise<void> {
  await saveAppData(data);
}
