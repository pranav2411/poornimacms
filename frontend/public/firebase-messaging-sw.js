importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Force the service worker to activate immediately and take control of the clients
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

firebase.initializeApp({
  apiKey: "AIzaSyCsYlCmkAAYDO_7BOPAsckp9ky0JclVtyM",
  authDomain: "poornimacms-4d082.firebaseapp.com",
  projectId: "poornimacms-4d082",
  appId: "1:452642564279:web:94477cb6754f7c4364c532",
  messagingSenderId: "452642564279"
});

const messaging = firebase.messaging();

// ─── Background message handler ────────────────────────────────────────────
// Fires when the app is in the background / tab is closed.
// We only display a notification manually if the payload does NOT contain
// a "notification" property (data-only payload). If a "notification" key is
// present, the Firebase SDK automatically displays it, avoiding duplicates.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  if (payload.notification) {
    return;
  }

  const notificationTitle = payload.data?.title || 'Poornima CMS Alert';
  const link = payload.data?.link || '/';
  const rawBody = payload.data?.body || '';
  const cleanBody = rawBody.replace(/\s*\[SOS_ID:[a-fA-F0-9\-]+\]/, '').trim();

  const notificationOptions = {
    body: cleanBody,
    icon: self.location.origin + '/PCElogo.png',
    badge: self.location.origin + '/PCElogo.png',
    tag: 'pcms-' + Date.now(),
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { link },
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Helper to extract the redirection link from various Firebase payload structures
function getLinkFromNotification(notification) {
  const data = notification?.data;
  if (!data) return '/';
  
  if (data.link) return data.link;
  if (data.data?.link) return data.data.link;
  if (data.FCM_MSG?.data?.link) return data.FCM_MSG.data.link;
  if (data.notification?.click_action) return data.notification.click_action;
  
  return '/';
}

// ─── Notification click handler ─────────────────────────────────────────────
// Fires on desktop Chrome AND Android Chrome when the user taps the notification.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const link = getLinkFromNotification(event.notification);

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        // Focus existing open tab if present
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(link);
            return client.focus();
          }
        }
        // Otherwise open a new window
        return clients.openWindow(link);
      })
  );
});