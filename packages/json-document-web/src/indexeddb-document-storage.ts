import type { WebAsyncDocumentStorage } from "./stored-document.js";

/** IndexedDB adapter with optimistic revisions: another tab's newer save is never silently replaced. */
export function createWebIndexedDBStorage(databaseName: string): WebAsyncDocumentStorage {
  const revisions = new Map<string, number>();
  async function open() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {request.result.createObjectStore("documents");};
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("다른 탭의 저장소 연결을 확인해 주세요."));
    });
  }
  return {
    async getItem(key) {
      const db = await open();
      try {return await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction("documents", "readonly");
        const request = tx.objectStore("documents").get(key);
        tx.oncomplete = () => {const row = request.result as {revision: number; value: string} | undefined; revisions.set(key, row?.revision ?? 0); resolve(row?.value ?? null);};
        tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      });} finally {db.close();}
    },
    async setItem(key, value) {
      const db = await open();
      try {await new Promise<void>((resolve, reject) => {
        const expected = revisions.get(key);
        if (expected === undefined) {reject(new Error("문서를 먼저 읽어 주세요.")); return;}
        const tx = db.transaction("documents", "readwrite");
        const store = tx.objectStore("documents");
        const request = store.get(key);
        request.onsuccess = () => {
          const row = request.result as {revision: number} | undefined;
          if ((row?.revision ?? 0) !== expected) {tx.abort(); return;}
          store.put({revision: expected + 1, value}, key);
        };
        tx.oncomplete = () => {revisions.set(key, expected + 1); resolve();};
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error("다른 탭에서 문서가 바뀌었거나 저장을 완료하지 못했습니다."));
      });} finally {db.close();}
    },
  };
}
