"use client";

import { useEffect } from "react";

/** Événement DOM : une nouvelle version du service worker attend d'être activée. */
export const EVENT_SW_UPDATE = "reserva:sw-update";

/** Enregistre le SW PWA et signale les mises à jour disponibles. */
export function EnregistreurPwa() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;

    let registration: ServiceWorkerRegistration | null = null;
    let annule = false;

    function signaler(sw: ServiceWorker | null) {
      if (!sw || annule) return;
      window.dispatchEvent(new CustomEvent(EVENT_SW_UPDATE, { detail: { waiting: sw } }));
    }

    function surUpdateFound(reg: ServiceWorkerRegistration) {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          signaler(reg.waiting);
        }
      });
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (annule) return;
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) {
          signaler(reg.waiting);
        }
        reg.addEventListener("updatefound", () => surUpdateFound(reg));
        // Vérifie périodiquement (onglet long ouvert)
        // Poll SW pendant l'utilisation — aligne sur INTERVALLE_POLL_VERSIONS_MS (bannière).
        const id = window.setInterval(() => {
          reg.update().catch(() => undefined);
        }, 30_000);
        (reg as ServiceWorkerRegistration & { __interval?: number }).__interval = id;
      })
      .catch(() => undefined);

    const onFocus = () => {
      registration?.update().catch(() => undefined);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocus();
    });

    return () => {
      annule = true;
      window.removeEventListener("focus", onFocus);
      const id = (registration as ServiceWorkerRegistration & { __interval?: number } | null)?.__interval;
      if (id) window.clearInterval(id);
    };
  }, []);

  return null;
}

/** Active le SW en attente puis recharge (bannière « Mettre à jour »). */
export async function appliquerMiseAJourPwa() {
  if (!("serviceWorker" in navigator)) {
    window.location.reload();
    return;
  }
  const reg = await navigator.serviceWorker.getRegistration();
  const waiting = reg?.waiting;
  if (waiting) {
    waiting.postMessage({ type: "SKIP_WAITING" });
    await new Promise<void>((resolve) => {
      const onController = () => {
        navigator.serviceWorker.removeEventListener("controllerchange", onController);
        resolve();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onController);
      // Filet de sécurité
      window.setTimeout(() => resolve(), 1500);
    });
  }
  window.location.reload();
}
