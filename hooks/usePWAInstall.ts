'use client';

import { useState, useEffect } from 'react';

// Define the interface for the event, as TypeScript's default types might not include it.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Check if the app is already running in standalone mode.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      // Store the event so it can be triggered later.
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    // Listen for the beforeinstallprompt event.
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Cleanup the event listener when the component unmounts.
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      return;
    }

    // Show the browser's installation prompt.
    await installPrompt.prompt();

    // Wait for the user to respond to the prompt.
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the PWA installation');
      // The prompt can only be used once. Clear it.
      setInstallPrompt(null);
      setIsAppInstalled(true);
    } else {
      console.log('User dismissed the PWA installation');
    }
  };

  // Do not show the install button if the app is already installed.
  const canInstall = !!installPrompt && !isAppInstalled;

  return { canInstall, handleInstall };
};
