import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

// Requests browser notification permission once
async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function showBrowserNotif(title: string, body: string) {
  if (Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    icon:  '/pwa-192x192.png',
    badge: '/favicon-32x32.png',
    vibrate: [200, 100, 200],
  } as NotificationOptions);
  n.onclick = () => { window.focus(); n.close(); };
}

// Listens to the user's Firestore notifications in real-time.
// When a NEW document arrives (after initial load), shows a browser popup.
// Works when the app is open or in a background tab — 100% free, no paid plan needed.
export function usePushNotifications(userId: string | null | undefined) {
  const initialised = useRef(false);

  useEffect(() => {
    if (!userId) return;

    requestPermission();

    // Listen to notifications for this user
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc'),
      limit(20),
    );

    let firstLoad = true;

    const unsub = onSnapshot(q, (snapshot) => {
      if (firstLoad) { firstLoad = false; return; } // skip initial load

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const d = change.doc.data();
          showBrowserNotif(d.title || 'RurAgriConnect', d.message || '');
        }
      });
    }, () => { /* ignore permission errors */ });

    // Also listen to broadcast notifications
    const qBroadcast = query(
      collection(db, 'notifications'),
      where('user_id', '==', 'broadcast'),
      orderBy('created_at', 'desc'),
      limit(5),
    );

    let firstBroadcast = true;
    const unsubBroadcast = onSnapshot(qBroadcast, (snapshot) => {
      if (firstBroadcast) { firstBroadcast = false; return; }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const d = change.doc.data();
          showBrowserNotif(d.title || 'RurAgriConnect', d.message || '');
        }
      });
    }, () => {});

    initialised.current = true;
    return () => { unsub(); unsubBroadcast(); };
  }, [userId]);
}
