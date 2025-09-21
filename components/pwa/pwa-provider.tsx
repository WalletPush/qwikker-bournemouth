'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { 
  isPushNotificationSupported,
  isPWASupported,
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

  useEffect(() => {
    // Check PWA support
    const supported = isPWASupported();
    const installed = isPWAInstalled();
    
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
    console.log('🚀 handleInstallPWA called - attempting to show browser install prompt');
    try {
      const installed = await showPWAInstallPrompt();
      console.log('🎯 showPWAInstallPrompt result:', installed);
      if (installed) {
        console.log('✅ PWA installed successfully');
        setShowInstallModal(false);
        setIsInstalled(true);
      } else {
        console.log('❌ PWA installation cancelled or not available - showing manual instructions');
        // Don't show alert, the manual instructions are already visible in the modal
      }
    } catch (error) {
      console.error('❌ Error in handleInstallPWA:', error);
      // Don't show alert, the manual instructions are already visible in the modal
    }
  };

  // Expose install function to child components
  const installPWA = () => {
    console.log('🚀 installPWA called:', { isInstalled, isSupported });
    if (!isInstalled && isSupported) {
      console.log('✅ Opening PWA install modal');
      setShowInstallModal(true);
    } else {
      console.log('❌ Not opening modal:', { isInstalled, isSupported });
      // For debugging, show modal anyway
      console.log('🐛 Showing modal anyway for debugging');
      setShowInstallModal(true);
    }
  };

  return (
    <PWAContext.Provider value={{ installPWA, isInstalled, isSupported }}>
      {children}
      
      {/* PWA Install Modal */}
      {showInstallModal && !isInstalled && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowInstallModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-colors touch-manipulation"
              aria-label="Close modal"
            >
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
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
              
              <div className="space-y-4">
                <button
                  onClick={() => {
                    console.log('🎯 Modal "Add to Home Screen" clicked!');
                    try {
                      handleInstallPWA();
                    } catch (error) {
                      console.error('❌ Error calling handleInstallPWA:', error);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  Try Automatic Install
                </button>
                
                {/* Manual Instructions */}
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-3 text-sm">📱 Safari Installation (iPhone/iPad):</h4>
                  <div className="text-slate-300 text-xs space-y-3">
                    <div className="bg-slate-600/50 rounded-lg p-3">
                      <p className="font-medium text-yellow-300 mb-2">⚠️ Important for Safari users:</p>
                      <p className="mb-2">Safari requires manual installation. Follow these exact steps:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Tap the <strong>Share button (⬆️)</strong> at the bottom of Safari</li>
                        <li>Scroll down in the share menu</li>
                        <li>Tap <strong>"Add to Home Screen"</strong></li>
                        <li>You'll see "Qwikker" with our icon</li>
                        <li>Tap <strong>"Add"</strong> in the top right</li>
                      </ol>
                      <p className="mt-2 text-green-300">✅ The app will then open without Safari's address bar!</p>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <span className="text-[#00d083] font-bold">💻</span>
                      <div>
                        <p className="font-medium">On Chrome/Edge:</p>
                        <p>1. Look for install icon (⬇️) in address bar</p>
                        <p>2. Or tap menu (⋮) → "Install app"</p>
                        <p>3. Follow the prompts</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowInstallModal(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
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
