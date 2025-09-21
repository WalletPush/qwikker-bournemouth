'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { 
  isPushNotificationSupported, 
  requestNotificationPermission, 
  subscribeToPushNotifications,
  setupPWAInstallPrompt,
  showPWAInstallPrompt,
  isPWAInstalled
} from '@/lib/push-notifications';

// Create context for PWA functions
const PWAContext = createContext<{
  installPWA: () => void;
  isInstalled: boolean;
  isSupported: boolean;
} | null>(null);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

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
  const [showInstallModal, setShowInstallModal] = useState(false);

  console.log('🚀 PWA Provider initialized:', { userId, enablePushNotifications, enableInstallPrompt });

  useEffect(() => {
    // Check PWA support
    const supported = isPushNotificationSupported();
    const installed = isPWAInstalled();
    
    console.log('🔍 PWA Support Check:', { supported, installed });
    
    setIsSupported(supported);
    setIsInstalled(installed);
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Setup PWA install prompt
    if (enableInstallPrompt) {
      setupPWAInstallPrompt();
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
      setShowInstallModal(false);
      setIsInstalled(true);
    }
  };

  // Expose install function to child components
  const installPWA = () => {
    if (!isInstalled && isSupported) {
      setShowInstallModal(true);
    }
  };

  return (
    <PWAContext.Provider value={{ installPWA, isInstalled, isSupported }}>
      {children}
      
      {/* PWA Install Modal */}
      {showInstallModal && !isInstalled && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              {/* Qwikker Logo */}
              <div className="w-16 h-16 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-black">Q</span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">
                Add Qwikker to Your Home Screen
              </h3>
              
              <p className="text-slate-300 mb-6 leading-relaxed">
                Get instant access to your personalized dashboard, exclusive offers, and AI concierge - 
                all with an app-like experience, no downloads needed.
              </p>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-[#00d083]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Lightning Fast Access</p>
                    <p className="text-slate-400 text-sm">One tap from your home screen</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-[#00d083]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12a3 3 0 0 1 6 0v12z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Works Offline</p>
                    <p className="text-slate-400 text-sm">Access your dashboard anywhere</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-[#00d083]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0-15 0v5h5l-5 5-5-5h5V7a9.5 9.5 0 1 1 19 0v10z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Push Notifications</p>
                    <p className="text-slate-400 text-sm">Never miss exclusive offers</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleInstallPWA}
                  className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  Add to Home Screen
                </button>
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="px-4 py-3 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm">
                  Don't want to install? You can{' '}
                  <button 
                    onClick={() => {
                      // Add to bookmarks instruction
                      if (navigator.share) {
                        navigator.share({
                          title: 'Qwikker Dashboard',
                          url: window.location.href
                        });
                      }
                      setShowInstallModal(false);
                    }}
                    className="text-[#00d083] hover:text-[#00b86f] underline"
                  >
                    bookmark this page
                  </button>
                  {' '}or access your dashboard from the back of your mobile wallet pass.
                </p>
              </div>
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
    </PWAContext.Provider>
  );
}
