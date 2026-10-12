"use client";

import { useEffect, useState } from "react";
import { comparerVersions, lireVersionsApp } from "../lib/api-app-versions";

const VERSION_WEB = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

export function BanniereMiseAJour() {
  const [mode, setMode] = useState<"none" | "soft" | "force">("none");
  const [minForce, setMinForce] = useState("0.9.0");
  const [dismiss, setDismiss] = useState(false);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const cfg = await lireVersionsApp();
        if (annule) return;
        const soft = cfg.web?.minSoft ?? "1.0.0";
        const force = cfg.web?.minForce ?? "0.9.0";
        setMinForce(force);
        if (comparerVersions(VERSION_WEB, force) < 0) setMode("force");
        else if (comparerVersions(VERSION_WEB, soft) < 0) setMode("soft");
        else setMode("none");
      } catch {
        /* ignore réseau */
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  if (mode === "force") {
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
            onClick={() => window.location.reload()}
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  if (mode === "soft" && !dismiss) {
    return (
      <div className="flex items-center justify-between gap-3 bg-[#1A56DB] px-4 py-2 text-sm text-white">
        <span>Une nouvelle version de la console est disponible.</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded bg-white/20 px-3 py-1 font-semibold hover:bg-white/30"
            onClick={() => window.location.reload()}
          >
            Recharger
          </button>
          <button type="button" className="opacity-80 hover:opacity-100" onClick={() => setDismiss(true)} aria-label="Fermer">
            ×
          </button>
        </div>
      </div>
    );
  }

  return null;
}
