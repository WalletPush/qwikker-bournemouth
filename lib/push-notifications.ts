/**
 * Push Notifications Utility for Qwikker PWA
 * Handles subscription, sending, and managing push notifications
 */

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  type?: 'business_approved' | 'new_offer' | 'secret_menu' | 'general';
  data?: Record<string, any>;
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check if PWA installation is supported
 */
export function isPWASupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    typeof window !== 'undefined'
  );
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported');
  }

  const permission = await Notification.requestPermission();
  console.log('🔔 Notification permission:', permission);
  return permission;
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPushNotifications(userId?: string): Promise<PushSubscriptionData | null> {
  try {
    // Check if service worker is ready
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.pushManager) {
      throw new Error('Push manager unavailable');
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
        'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f8HnVJyWAcJEXAiR3RSI4HXH6MuCxSGHWh1NQ6E8sUPUGfXm0_Y'; // Default VAPID key for testing
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }

    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!)
      }
    };

    // Save subscription to database
    if (userId) {
      await saveSubscriptionToDatabase(userId, subscriptionData);
    }

    console.log('✅ Push notification subscription successful');
    return subscriptionData;
  } catch (error) {
    console.error('❌ Push notification subscription failed:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(userId?: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove from database
      if (userId) {
        await removeSubscriptionFromDatabase(userId);
      }
      
      console.log('✅ Push notification unsubscription successful');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Push notification unsubscription failed:', error);
    return false;
  }
}

/**
 * Send a test notification (client-side)
 */
export async function sendTestNotification(): Promise<void> {
  if (Notification.permission === 'granted') {
    new Notification('Qwikker Test', {
      body: 'Push notifications are working! 🎉',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png'
    });
  }
}

/**
 * Save subscription to Supabase database
 */
async function saveSubscriptionToDatabase(userId: string, subscription: PushSubscriptionData): Promise<void> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        subscription
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }

    console.log('💾 Subscription saved to database');
  } catch (error) {
    console.error('❌ Failed to save subscription:', error);
  }
}

/**
 * Remove subscription from database
 */
async function removeSubscriptionFromDatabase(userId: string): Promise<void> {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription');
    }

    console.log('🗑️ Subscription removed from database');
  } catch (error) {
    console.error('❌ Failed to remove subscription:', error);
  }
}

/**
 * Utility functions for key conversion
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * PWA Installation utilities
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Listen for PWA install prompt
 */
export function setupPWAInstallPrompt(): void {
  console.log('🔧 Setting up PWA install prompt listeners');
  
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 PWA install prompt available - beforeinstallprompt event fired');
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });

  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installed successfully - appinstalled event fired');
    deferredPrompt = null;
  });
  
  // Check if already installed
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    console.log('📱 PWA is already running in standalone mode');
  }
  
  // Fallback for browsers that don't support beforeinstallprompt
  setTimeout(() => {
    if (!deferredPrompt) {
      console.log('⚠️ beforeinstallprompt event did not fire - browser may not support PWA install prompts');
    }
  }, 5000);
}

/**
 * Show PWA install prompt
 */
export async function showPWAInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('❌ PWA install prompt not available');
    console.log('💡 This could be because:');
    console.log('   - Browser doesn\'t support PWA install prompts (common on Safari)');
    console.log('   - PWA is already installed');
    console.log('   - Site is not served over HTTPS');
    console.log('   - beforeinstallprompt event hasn\'t fired yet');
    
    // Don't show alert - manual instructions are shown in the modal
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`🎯 PWA install prompt result: ${outcome}`);
    deferredPrompt = null;
    
    return outcome === 'accepted';
  } catch (error) {
    console.error('❌ PWA install prompt failed:', error);
    return false;
  }
}

/**
 * Check if PWA is installed
 */
export function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}
