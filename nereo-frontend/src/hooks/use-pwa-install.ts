"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Hook to manage PWA install prompt.
 * Shows the install prompt on the second visit.
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Track visits for "show on second access" behavior
    const visits = parseInt(localStorage.getItem("nereo-visits") ?? "0", 10);
    localStorage.setItem("nereo-visits", String(visits + 1));

    const handler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(prompt);
      // Only show on second+ visit
      if (visits >= 1) {
        setCanInstall(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setCanInstall(false);
    setDeferredPrompt(null);
  }, []);

  return { canInstall, install, dismiss };
}
