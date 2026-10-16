"use client";

import { useCallback, useEffect, useState } from "react";
import { decideModeMiseAJour, lireVersionsApp } from "../lib/api-app-versions";
import { EVENT_SW_UPDATE, appliquerMiseAJourPwa } from "./EnregistreurPwa";

export const EVENT_VERSIONS_MAJ = "reserva:versions-updated";

const VERSION_WEB = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

type Mode = "none" | "soft" | "force" | "pwa";

/**
 * Bannière / écran de mise à jour web :
 * - soft/force selon /app/versions (minSoft / minForce)
 * - pwa quand un nouveau service worker attend
 * Disparaît après rechargement si la version installée ≥ seuils (ou SW activé).
 */
export function BanniereMiseAJour() {
  const [mode, setMode] = useState<Mode>("none");
  const [minForce, setMinForce] = useState("0.9.0");
  const [minSoft, setMinSoft] = useState("1.0.0");
  const [dismiss, setDismiss] = useState(false);
  const [pwaDispo, setPwaDispo] = useState(false);

  const evaluerApi = useCallback(async () => {
    try {
      const cfg = await lireVersionsApp();
      const soft = cfg.web?.minSoft ?? "1.0.0";
      const force = cfg.web?.minForce ?? "0.9.0";
      setMinSoft(soft);
      setMinForce(force);
      const next = decideModeMiseAJour({
        versionInstallee: VERSION_WEB,
        minSoft: soft,
        minForce: force,
      });
      if (next === "force" || next === "soft") setDismiss(false);
      setMode(next);
    } catch {
      /* ignore réseau */
    }
  }, []);

  useEffect(() => {
    void evaluerApi();
    const onSw = () => {
      setPwaDispo(true);
      setDismiss(false);
    };
    const onVersions = () => {
      void evaluerApi();
    };
    window.addEventListener(EVENT_SW_UPDATE, onSw);
    window.addEventListener(EVENT_VERSIONS_MAJ, onVersions);
    const onFocus = () => {
      void evaluerApi();
    };
    window.addEventListener("focus", onFocus);
    const onVis = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(() => void evaluerApi(), 5 * 60_000);
    return () => {
      window.removeEventListener(EVENT_SW_UPDATE, onSw);
      window.removeEventListener(EVENT_VERSIONS_MAJ, onVersions);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, [evaluerApi]);

  const afficherSoft = (mode === "soft" || (pwaDispo && mode !== "force")) && !dismiss;
  const afficherForce = mode === "force";

  async function recharger() {
    await appliquerMiseAJourPwa();
  }

  if (afficherForce) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-6 text-center text-white">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-extrabold">Mise à jour obligatoire</h2>
          <p className="text-slate-300">
            La console (v{VERSION_WEB}) n&apos;est plus supportée. Rechargez après déploiement
            (minimum {minForce}).
          </p>
          <button
            type="button"
            className="rounded-lg bg-[#1A56DB] px-5 py-2.5 font-semibold"
            onClick={() => void recharger()}
          >
            Recharger maintenant
          </button>
        </div>
      </div>
    );
  }

  if (afficherSoft) {
    const message = pwaDispo
      ? "Une nouvelle version de la console est prête à être installée."
      : `Une mise à jour est disponible (vous : v${VERSION_WEB}, requis : ≥ ${minSoft}).`;
    return (
      <>
        {/* fixed : au-dessus du header sticky (z-40), non masquée au scroll */}
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[90] flex items-center justify-between gap-3 bg-[#1A56DB] px-4 py-2.5 text-sm text-white shadow-md"
        >
          <span className="font-medium">{message}</span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded bg-white px-3 py-1 font-semibold text-[#1A56DB] hover:bg-blue-50"
              onClick={() => void recharger()}
            >
              Mettre à jour
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 opacity-80 hover:bg-white/10 hover:opacity-100"
              onClick={() => setDismiss(true)}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>
        <div aria-hidden className="h-11 shrink-0" />
      </>
    );
  }

  return null;
}
