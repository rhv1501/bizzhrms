/* Service Worker for HRMS push notifications */
self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'HRMS', body: event.data ? event.data.text() : 'Notification' };
  }

  const title = data.title || 'HRMS Notification';
  const options = {
    body: data.body || '',
    icon: '/logo-192.png',
    data: data.url || '/',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(clients.openWindow(url));
});
