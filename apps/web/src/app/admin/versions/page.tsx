"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ConfigVersions,
  decideModeMiseAJour,
  lireVersionsApp,
  mettreAJourVersionsApp,
} from "../../../lib/api-app-versions";
import { extraireMessageErreur } from "../../../lib/api-client";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { EVENT_VERSIONS_MAJ } from "../../../components/BanniereMiseAJour";

const VERSION_WEB = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

const VIDE: ConfigVersions = {
  client: { minSoft: "1.0.1", minForce: "1.0.0", storeUrlAndroid: "", storeUrlIos: "" },
  pro: { minSoft: "1.0.1", minForce: "1.0.0", storeUrlAndroid: "", storeUrlIos: "" },
  web: { minSoft: "1.0.1", minForce: "1.0.0" },
};

export default function PageVersions() {
  const [cfg, setCfg] = useState<ConfigVersions>(VIDE);
  const [chargement, setChargement] = useState(true);
  const [sauve, setSauve] = useState(false);

  useEffect(() => {
    lireVersionsApp()
      .then(setCfg)
      .catch((e) => toastErreur(extraireMessageErreur(e)))
      .finally(() => setChargement(false));
  }, []);

  const apercuWeb = useMemo(
    () =>
      decideModeMiseAJour({
        versionInstallee: VERSION_WEB,
        minSoft: cfg.web.minSoft,
        minForce: cfg.web.minForce,
      }),
    [cfg.web.minSoft, cfg.web.minForce],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSauve(true);
    try {
      const next = await mettreAJourVersionsApp(cfg);
      setCfg(next);
      toastSucces("Versions enregistrées — les apps relisent les seuils au prochain contrôle");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(EVENT_VERSIONS_MAJ));
      }
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    } finally {
      setSauve(false);
    }
  }

  function champ(
    canal: keyof ConfigVersions,
    cle: keyof ConfigVersions["client"],
    label: string,
  ) {
    const valeur = (cfg[canal] as Record<string, string | undefined>)[cle] ?? "";
    return (
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">{label}</span>
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          value={valeur}
          onChange={(ev) =>
            setCfg((prev) => ({
              ...prev,
              [canal]: { ...prev[canal], [cle]: ev.target.value },
            }))
          }
        />
      </label>
    );
  }

  if (chargement) return <p className="text-gray-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Versions apps</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          La bannière s&apos;affiche seulement si la version <em>installée</em> est{" "}
          <strong>strictement inférieure</strong> au seuil. Ex. app store en{" "}
          <code className="rounded bg-gray-100 px-1">1.0.1</code> → mettez{" "}
          <code className="rounded bg-gray-100 px-1">minSoft = 1.0.1</code> pour les clients
          encore en 1.0.0 ; pour tester sur votre appareil déjà en 1.0.1, mettez{" "}
          <code className="rounded bg-gray-100 px-1">1.0.2</code>.
        </p>
      </div>

      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          apercuWeb === "force"
            ? "border-red-200 bg-red-50 text-red-800"
            : apercuWeb === "soft"
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : "border-gray-200 bg-gray-50 text-gray-600"
        }`}
      >
        Console web actuelle : <strong>v{VERSION_WEB}</strong> → mode{" "}
        <strong>{apercuWeb}</strong>
        {apercuWeb === "none" && (
          <span>
            {" "}
            (augmentez <code className="rounded bg-white px-1">web.minSoft</code> au-dessus de{" "}
            {VERSION_WEB} pour afficher la bannière ici).
          </span>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        {(["client", "pro", "web"] as const).map((canal) => (
          <section key={canal} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold capitalize">{canal}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {champ(canal, "minSoft", "minSoft (bannière)")}
              {champ(canal, "minForce", "minForce (bloquant)")}
              {canal !== "web" && champ(canal, "storeUrlAndroid", "URL Play Store")}
              {canal !== "web" && champ(canal, "storeUrlIos", "URL App Store")}
            </div>
          </section>
        ))}
        <button
          type="submit"
          disabled={sauve}
          className="rounded-lg bg-[#1A56DB] px-5 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {sauve ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
