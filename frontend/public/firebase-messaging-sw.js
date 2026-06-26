importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

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
// The Notification API here creates the system-level notification that
// appears in Chrome's notification panel (and the Android notification shade).
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Poornima CMS Alert';
  const link =
    payload.data?.link ||
    payload.notification?.click_action ||
    payload.fcmOptions?.link ||
    '/';

  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: self.location.origin + '/PCElogo.png',
    badge: self.location.origin + '/PCElogo.png',
    // Using a unique tag per-message prevents stacking identical toasts
    tag: 'pcms-' + Date.now(),
    // requireInteraction keeps it visible until user acts (desktop Chrome)
    requireInteraction: true,
    // vibrate pattern for Android
    vibrate: [200, 100, 200],
    data: { link },
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ─── Notification click handler ─────────────────────────────────────────────
// Fires on desktop Chrome AND Android Chrome when the user taps the notification.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const link = event.notification.data?.link || '/';

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

// ─── Push event fallback ────────────────────────────────────────────────────
// Some browsers (Samsung Internet, older Android WebView) fire 'push' directly
// and may not go through onBackgroundMessage. This acts as a safety net.
self.addEventListener('push', function (event) {
  // If Firebase already handled it, it won't reach here.
  // This fires only if the Firebase SDK didn't intercept.
  if (!event.data) return;

  let title = 'Poornima CMS Alert';
  let body = '';
  let link = '/';

  try {
    const data = event.data.json();
    title = data?.notification?.title || title;
    body = data?.notification?.body || body;
    link = data?.data?.link || data?.notification?.click_action || link;
  } catch {
    body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: self.location.origin + '/PCElogo.png',
      badge: self.location.origin + '/PCElogo.png',
      tag: 'pcms-fallback-' + Date.now(),
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: { link },
    })
  );
});