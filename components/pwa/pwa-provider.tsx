'use client';

import { useEffect, useState } from 'react';
import { 
  isPushNotificationSupported, 
  requestNotificationPermission, 
  subscribeToPushNotifications,
  setupPWAInstallPrompt,
  showPWAInstallPrompt,
  isPWAInstalled
} from '@/lib/push-notifications';

interface PWAProviderProps {
  children: React.ReactNode;
  userId?: string;
  enablePushNotifications?: boolean;
  enableInstallPrompt?: boolean;
}

export function PWAProvider({ 
  children, 
  userId, 
  enablePushNotifications = true,
  enableInstallPrompt = true 
}: PWAProviderProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Check PWA support
    setIsSupported(isPushNotificationSupported());
    setIsInstalled(isPWAInstalled());
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Setup PWA install prompt
    if (enableInstallPrompt) {
      setupPWAInstallPrompt();
      
      // Show install banner if not installed and supported
      const timer = setTimeout(() => {
        if (!isPWAInstalled() && isPushNotificationSupported()) {
          setShowInstallBanner(true);
        }
      }, 10000); // Show after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [enableInstallPrompt]);

  const handleEnableNotifications = async () => {
    if (!enablePushNotifications || !userId) return;

    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        await subscribeToPushNotifications(userId);
        console.log('✅ Push notifications enabled');
      }
    } catch (error) {
      console.error('❌ Failed to enable notifications:', error);
    }
  };

  const handleInstallPWA = async () => {
    const installed = await showPWAInstallPrompt();
    if (installed) {
      setShowInstallBanner(false);
      setIsInstalled(true);
    }
  };

  return (
    <>
      {children}
      
      {/* PWA Install Banner */}
      {showInstallBanner && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
          <div className="bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-2xl p-4 shadow-2xl border border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-white">Q</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm mb-1">Install Qwikker App</h3>
                <p className="text-white/90 text-xs mb-3">
                  Get faster access and offline features
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleInstallPWA}
                    className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Install
                  </button>
                  <button
                    onClick={() => setShowInstallBanner(false)}
                    className="text-white/80 hover:text-white text-xs font-medium px-3 py-1.5 transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-white/60 hover:text-white/80 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Permission Banner */}
      {enablePushNotifications && isSupported && notificationPermission === 'default' && userId && (
        <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
          <div className="bg-slate-800/95 backdrop-blur border border-slate-700 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0-15 0v5h5l-5 5-5-5h5V7a9.5 9.5 0 1 1 19 0v10z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm mb-1">Stay Updated</h3>
                <p className="text-slate-300 text-xs mb-3">
                  Get notified about new offers and business updates
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleEnableNotifications}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => setNotificationPermission('denied')}
                    className="text-slate-400 hover:text-slate-300 text-xs font-medium px-3 py-1.5 transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
