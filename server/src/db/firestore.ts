import * as admin from 'firebase-admin';
import path from 'path';

let _db: admin.firestore.Firestore;

export function getFirestore(): admin.firestore.Firestore {
  if (_db) return _db;

  if (!admin.apps.length) {
    const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (inlineJson && inlineJson.length > 10) {
      try {
        const cleaned = inlineJson.replace(/\\n/g, '\n');
        const serviceAccount = JSON.parse(cleaned);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'ruralagriconnect-15c7c',
        });
        console.log('✅ Firebase initialized from env var');
      } catch (e: any) {
        console.error('❌ Parse error:', e.message, '| First 50:', inlineJson.substring(0, 50));
        throw e;
      }
    } else {
      // Fallback: use hardcoded credentials (for Railway where env var isn't working)
      const serviceAccount = {
        type: 'service_account',
        project_id: 'ruralagriconnect-15c7c',
        private_key_id: 'bfcc7b5cf7e3e6027f54790eb0217f5bbbca38b7',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDPruFf/aOTVS3D\nU/FhQ//j3VPUHircEkiD9ngfSIJpMqgUEr+XFr4ucM2zK/EgcvDnUwSCHjTQIyOq\nqUJufYKNgLPHs6p6XIS3NtWPz4wCAW5ifG4SXBgqrFEgI67f8ENAYrMnAve9YbNY\nZ1UDkpVfOKw7OtTLwnG8aOy5+zmSdMY4CpyGpoy0+n/fVi8iCO/kYkVjbg7MbC+Y\nOlzD2OrZyHObJ/R/JM3/3KZ1YsBEk3E1XLH4NQ2nu4SgtKI5zXMdixWusW+62X/w\niE1IcQBqJ3Buvk9AJSHRI0scEPaEUUSdLZSgYYvDfAfFPdTALU5uYmB5LXtQtnbv\nV07+DGvJAgMBAAECggEAFy+CaLmDy/x77e0Oqxmw1SsN40X06fm+j8Dx2yg4qu7l\nVcxcCE2ZMM0WIdUbh9BdNa4OeEpQAhaSMkjQKk6nxw1hxL85nox6ooukHviAPG8V\neDhE/5a5efYf3nMtYEHN+D+smYPazZE9OPbcRlhUhbtpevlP7WmJUgvytbam0EM2\nn5dnQZZv/Vzj2Z0ukKwTBn/sC1UiiBRCPxHM99S76+qJZjqf4InNzLxu7FuHU8DI\n2ZAKhugYpc1OUcc4B0vhFsmwE28KsTE3pOrZhNvVc1FPbFgB5C1jaY1zR+bRiz8R\n72HXKonUsY1Nry3JxK/UToz/cVNGIMNw7Si2DN+SEwKBgQDwx55RMXS9XlMeRQcr\niOEnH6WZk1b4XIVFZgAqBfrGTZlnisvVBeC5tWMrj8LLLUlu7ah3Oyk+hFrKN0Ck\nXmsFJ36aMfs54RJedsVKrKjSlw0XE5dhM/pCOe+Wq7O4Lyvt8qtPq3KBguy4dXpB\nW76BZx1P4ouPSH5tULt95yUqMwKBgQDcz65FqjHOpUv2x6vaKI37PPZid1VSMQiL\ntputaPD+Q5CRrd0khiK9ciB6m1yLOH15h4LSPpKWIGNLr1xPgRR+oLMtOqXLwS73\nsY12DHzsaBigSqyrLSKc3i7LbqD3pteV8jFI4TwdFKF2BylzAq+9z+xiZltnCTsu\nEzS/hZaOEwKBgBj32kb5Je3tNhlRdyjgjNiNw5JlYQNoNLm5lhLFg/fEXEAMeI6i\niWc4lAwUYFLJY3AJXQrgK6q79t45VI6268ohClPbEv4xhMIe9t6DgQ41c7oM4gnG\nZhEwCNRLAdv7qEaIf5NHaBxeA0YtiHv2k46/rp52E5rMHbAgSxEHQydZAoGBALy4\n7/zwusMgee2AuLurf7YkY3zC+3RVHjWzLBkpIRhgDNbF38VQs65xNZs04ALJlExj\naodhHY4cPmG4jlARRb/4f0t/3aZpBUiEQyCLCdZQHgQZ7rwaxoOGTj5m3kLsIUQy\nDLd6chN0x48GDgITYLr9U87CJwrIVAFMPwAWIBhrAoGBALVLwH+RMnqvylsrIoq7\nGsPTK6eXPbNxgxlUzRKped4stBI6YxQ7cnS0WJybIA0MisoOhhOLiHw42KZ4j1Jq\njlkw29+KIi66P7123nvF6JV9dOngTYIcMDhq4qEHbYeXnajw6LUt2KWyJOh6pqXH\nI4IBUOCWE4y/Ii57L0lqEwnZ\n-----END PRIVATE KEY-----\n',
        client_email: 'firebase-adminsdk-fbsvc@ruralagriconnect-15c7c.iam.gserviceaccount.com',
        client_id: '107422871369186298152',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
      };
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: 'ruralagriconnect-15c7c',
      });
      console.log('✅ Firebase initialized from hardcoded credentials');
    }
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
