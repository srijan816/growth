'use client';

import { useEffect, useState } from 'react';
import { registerServiceWorker, subscribeToPushNotifications } from '@/lib/pwa/register-sw';
import { Button } from '@/components/ui/button';
import { Bell, Download, X } from 'lucide-react';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    // Register service worker
    registerServiceWorker().then(registration => {
      if (registration) {
        // Check if we should prompt for notifications
        if (Notification.permission === 'default') {
          setTimeout(() => {
            setShowNotificationPrompt(true);
          }, 30000); // Show after 30 seconds
        }
      }
    });

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is installed
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        if (apps.length > 0) {
          console.log('App is already installed');
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleNotificationClick = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await subscribeToPushNotifications(registration);
    
    if (subscription) {
      console.log('Push notifications enabled');
    }
    
    setShowNotificationPrompt(false);
  };

  return (
    <>
      {children}

      {/* Install App Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Download className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Install Growth Compass</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Install our app for a better experience with offline access and quick launch
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleInstallClick}>
                    Install App
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowInstallPrompt(false)}
                  >
                    Not Now
                  </Button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowInstallPrompt(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Notification Permission Prompt */}
      {showNotificationPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Enable Notifications</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Get notified about student milestones, new feedback, and important updates
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleNotificationClick}>
                    Enable Notifications
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowNotificationPrompt(false)}
                  >
                    Not Now
                  </Button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowNotificationPrompt(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}