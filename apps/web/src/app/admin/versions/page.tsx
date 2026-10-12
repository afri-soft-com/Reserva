"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ConfigVersions,
  lireVersionsApp,
  mettreAJourVersionsApp,
} from "../../../lib/api-app-versions";
import { extraireMessageErreur } from "../../../lib/api-client";
import { toastErreur, toastSucces } from "../../../components/Toast";

const VIDE: ConfigVersions = {
  client: { minSoft: "1.0.0", minForce: "0.9.0", storeUrlAndroid: "", storeUrlIos: "" },
  pro: { minSoft: "1.0.0", minForce: "0.9.0", storeUrlAndroid: "", storeUrlIos: "" },
  web: { minSoft: "1.0.0", minForce: "0.9.0" },
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSauve(true);
    try {
      const next = await mettreAJourVersionsApp(cfg);
      setCfg(next);
      toastSucces("Versions enregistrées");
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
        <p className="mt-1 text-sm text-gray-500">
          Soft = bannière ; Force = écran bloquant. Les bannières disparaissent dès que
          l&apos;app installée ≥ minSoft / minForce.
        </p>
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
