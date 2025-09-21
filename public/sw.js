// Minimal Safari-compatible service worker
const CACHE_NAME = 'qwikker-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Fetch event - minimal implementation
self.addEventListener('fetch', (event) => {
  // Let all requests go to network for now
  // This is just to satisfy PWA requirements
});

console.log('📱 Qwikker Service Worker loaded');