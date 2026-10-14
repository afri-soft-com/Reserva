"use client";

import { useEffect } from "react";

/** Enregistre le service worker PWA (admin installable). */
export function EnregistreurPwa() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
