importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBb9JDMLqtqWFG2BdTFogNx_W8T7laJR3Q",
  authDomain: "poornimacms.firebaseapp.com",
  projectId: "poornimacms",
  appId: "1:207036150574:web:5783b6615c4330885800bf",
  messagingSenderId: "207036150574"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Poornima CMS Alert';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: self.location.origin + '/PCElogo.png',
    badge: self.location.origin + '/PCElogo.png',
    tag: 'poornima-cms-notification',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Extract link from FCM payload data structures
  const fcmOptions = event.notification.data?.FCM_MSG?.notification?.fcm_options;
  const fcmLink = fcmOptions?.link;
  const clickAction = event.notification.data?.click_action || fcmLink || event.notification.data?.link || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        if (client.navigate) {
          client.navigate(clickAction);
        }
        return client.focus();
      }
      return clients.openWindow(clickAction);
    })
  );
});
