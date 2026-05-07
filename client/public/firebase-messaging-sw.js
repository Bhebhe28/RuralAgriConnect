importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyAf2mL_l0tYp53M0rvpKbobp8lGjiefuB8',
  authDomain:        'ruralagriconnect-15c7c.firebaseapp.com',
  projectId:         'ruralagriconnect-15c7c',
  storageBucket:     'ruralagriconnect-15c7c.firebasestorage.app',
  messagingSenderId: '778050359590',
  appId:             '1:778050359590:web:9438ba158494f26271b1e7',
});

const messaging = firebase.messaging();

// Background message handler — app is closed or in background
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'RurAgriConnect';
  const body  = payload.notification?.body  || '';
  const link  = (payload.data && payload.data.link) ? payload.data.link : '/notifications';

  self.registration.showNotification(title, {
    body,
    icon:    '/pwa-192x192.png',
    badge:   '/favicon-32x32.png',
    vibrate: [200, 100, 200],
    tag:     payload.data?.notif_id || 'rac-notif',
    renotify: true,
    data: { link },
  });
});

// Open / focus app when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link)
    ? event.notification.data.link
    : '/notifications';
  const fullUrl = 'https://ruralagriconnect-15c7c.web.app' + link;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (win.url.startsWith('https://ruralagriconnect-15c7c.web.app') && 'focus' in win) {
          win.navigate(fullUrl);
          return win.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(fullUrl);
    })
  );
});
