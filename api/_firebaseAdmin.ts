import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let firestoreInstance: any = null;
let adminAuthInstance: any = null;

try {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    const jsonText = Buffer.from(base64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(jsonText);
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    firestoreInstance = getFirestore();
    adminAuthInstance = getAuth();
  }
} catch (e) {
  console.warn('[Firebase Admin] Service account not initialized or invalid, using fallback:', e);
}

// In-memory mock store for users & logs when Admin SDK is not connected
const memoryStore = new Map<string, Map<string, any>>();
function getCollectionStore(name: string) {
  if (!memoryStore.has(name)) {
    memoryStore.set(name, new Map());
  }
  return memoryStore.get(name)!;
}

const mockFirestore = {
  collection: (colName: string) => {
    const store = getCollectionStore(colName);
    return {
      doc: (docId?: string) => {
        const id = docId || 'doc_' + Math.random().toString(36).substring(2, 10);
        return {
          id,
          get: async () => ({
            exists: store.has(id),
            data: () => store.get(id),
          }),
          set: async (data: any, options?: any) => {
            const current = options?.merge ? (store.get(id) || {}) : {};
            store.set(id, { ...current, ...data });
            return { writeTime: new Date() };
          },
          update: async (data: any) => {
            const current = store.get(id) || {};
            store.set(id, { ...current, ...data });
            return { writeTime: new Date() };
          },
        };
      },
      add: async (data: any) => {
        const id = 'doc_' + Math.random().toString(36).substring(2, 10);
        store.set(id, data);
        return { id };
      },
      where: () => ({
        where: () => ({
          limit: () => ({
            get: async () => ({ empty: true, docs: [] }),
          }),
          get: async () => ({ empty: true, docs: [] }),
        }),
        limit: () => ({
          get: async () => ({ empty: true, docs: [] }),
        }),
        get: async () => ({ empty: true, docs: [] }),
      }),
    };
  },
  runTransaction: async (cb: any) => {
    const t = {
      get: async (ref: any) => ref.get(),
      set: async (ref: any, data: any) => ref.set(data),
      update: async (ref: any, data: any) => ref.update(data),
    };
    return cb(t);
  },
};

const mockAdminAuth = {
  createUser: async (userParams: any) => ({
    uid: 'usr_' + Math.random().toString(36).substring(2, 12),
    email: userParams.email,
    displayName: userParams.displayName,
  }),
};

export const firestore = firestoreInstance || (mockFirestore as any);
export const adminAuth = adminAuthInstance || (mockAdminAuth as any);
export const isFirebaseAdminActive = Boolean(firestoreInstance && adminAuthInstance);
