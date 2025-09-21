// Custom service worker for Qwikker PWA
// This extends the default next-pwa service worker with push notification support

const CACHE_NAME = 'qwikker-v1';
const urlsToCache = [
  '/',
  '/user',
  '/user/discover',
  '/user/offers',
  '/user/secret-menu',
  '/dashboard',
  '/admin',
  '/offline'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('🚀 Qwikker PWA Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching essential resources');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Qwikker PWA Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.destination === 'document') {
          return caches.match('/offline');
        }
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received:', event);
  
  const options = {
    body: 'You have a new notification from Qwikker!',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-96x96.png'
      }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      options.title = payload.title || 'Qwikker Notification';
      options.body = payload.body || options.body;
      options.icon = payload.icon || options.icon;
      options.data = { ...options.data, ...payload.data };
      
      // Add custom actions based on notification type
      if (payload.type === 'business_approved') {
        options.actions = [
          {
            action: 'view_dashboard',
            title: 'View Dashboard',
            icon: '/icon-96x96.png'
          },
          {
            action: 'close',
            title: 'Close',
            icon: '/icon-96x96.png'
          }
        ];
      } else if (payload.type === 'new_offer') {
        options.actions = [
          {
            action: 'view_offer',
            title: 'View Offer',
            icon: '/icon-96x96.png'
          },
          {
            action: 'save_offer',
            title: 'Save for Later',
            icon: '/icon-96x96.png'
          }
        ];
      } else if (payload.type === 'secret_menu') {
        options.actions = [
          {
            action: 'view_secret_menu',
            title: 'View Secret Menu',
            icon: '/icon-96x96.png'
          },
          {
            action: 'share',
            title: 'Share',
            icon: '/icon-96x96.png'
          }
        ];
      }
    } catch (error) {
      console.error('Error parsing push notification data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('Qwikker', options)
  );
});

// Notification click event - handle user interactions
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  let url = '/';
  
  // Route based on action
  switch (action) {
    case 'view_dashboard':
      url = '/dashboard';
      break;
    case 'view_offer':
      url = '/user/offers';
      break;
    case 'view_secret_menu':
      url = '/user/secret-menu';
      break;
    case 'explore':
      url = '/user/discover';
      break;
    case 'save_offer':
      // Handle save offer action
      console.log('💾 Saving offer for later');
      return;
    case 'share':
      // Handle share action
      console.log('📤 Sharing secret menu');
      return;
    case 'close':
      return;
    default:
      // Default click behavior
      if (data && data.url) {
        url = data.url;
      }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync event - handle offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      console.log('📡 Performing background sync...')
    );
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('💬 Message received in service worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🎯 Qwikker PWA Service Worker loaded successfully!');
