import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
export const db   = getFirestore(app);
export default app;
