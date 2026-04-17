import * as admin from 'firebase-admin';
import path from 'path';

let _db: admin.firestore.Firestore;

export function getFirestore(): admin.firestore.Firestore {
  if (_db) return _db;

  if (!admin.apps.length) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.join(__dirname, '../../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(keyPath),
      projectId: 'ruralagriconnect-15c7c',
    });
  }

  _db = admin.firestore();
  return _db;
}

// ── Helpers ────────────────────────────────────────────────

export async function getDoc<T>(collection: string, id: string): Promise<T | null> {
  const db = getFirestore();
  const doc = await db.collection(collection).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as T;
}

export async function getDocs<T>(
  collection: string,
  filters: Array<[string, admin.firestore.WhereFilterOp, any]> = [],
  orderBy?: { field: string; dir?: 'asc' | 'desc' },
  limitN?: number
): Promise<T[]> {
  const db = getFirestore();
  let q: admin.firestore.Query = db.collection(collection);
  for (const [field, op, val] of filters) q = q.where(field, op, val);
  if (orderBy) q = q.orderBy(orderBy.field, orderBy.dir || 'desc');
  if (limitN) q = q.limit(limitN);
  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T);
}

export async function setDoc(collection: string, id: string, data: Record<string, any>): Promise<void> {
  const db = getFirestore();
  await db.collection(collection).doc(id).set(data);
}

export async function updateDoc(collection: string, id: string, data: Record<string, any>): Promise<void> {
  const db = getFirestore();
  await db.collection(collection).doc(id).update(data);
}

export async function deleteDoc(collection: string, id: string): Promise<void> {
  const db = getFirestore();
  await db.collection(collection).doc(id).delete();
}

export async function addDoc(collection: string, data: Record<string, any>): Promise<string> {
  const db = getFirestore();
  const ref = await db.collection(collection).add(data);
  return ref.id;
}

export async function countDocs(collection: string, filters: Array<[string, admin.firestore.WhereFilterOp, any]> = []): Promise<number> {
  const docs = await getDocs(collection, filters);
  return docs.length;
}

export function now(): string {
  return new Date().toISOString();
}
