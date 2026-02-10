"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nereo-high-contrast";

/**
 * Toggle the high-contrast theme for operario outdoor mode.
 * Persists preference in localStorage.
 * Applies `theme-high-contrast` class to <html>.
 */
export function useHighContrast() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") {
      setEnabled(true);
      document.documentElement.classList.add("theme-high-contrast");
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("theme-high-contrast");
      } else {
        document.documentElement.classList.remove("theme-high-contrast");
      }
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { enabled, toggle };
}
