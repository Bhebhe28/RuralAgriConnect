import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyAf2mL_l0tYp53M0rvpKbobp8lGjiefuB8',
  authDomain:        'ruralagriconnect-15c7c.firebaseapp.com',
  projectId:         'ruralagriconnect-15c7c',
  storageBucket:     'ruralagriconnect-15c7c.firebasestorage.app',
  messagingSenderId: '778050359590',
  appId:             '1:778050359590:web:9438ba158494f26271b1e7',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable offline persistence — Firestore caches all reads in IndexedDB.
// When offline, reads serve from cache; writes queue and sync when back online.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

export default app;
