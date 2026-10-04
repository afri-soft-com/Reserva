"use client";

import { useEffect, useState } from "react";
import { Carte } from "../../../components/Carte";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerVillesTransport, rechercherTrajetsAdmin } from "../../../lib/api-transport";

function aujourdhuiPlus(jours: number) {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

export default function PageAdminTransport() {
  const [villes, setVilles] = useState<string[]>([]);
  const [origine, setOrigine] = useState("Kinshasa");
  const [destination, setDestination] = useState("Matadi");
  const [date, setDate] = useState(aujourdhuiPlus(1));
  const [items, setItems] = useState<any[]>([]);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    listerVillesTransport().then((v) => {
      setVilles(v);
      if (v.includes("Kinshasa")) setOrigine("Kinshasa");
      if (v.includes("Matadi")) setDestination("Matadi");
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    setChargement(true);
    rechercherTrajetsAdmin({ origine, destination, date })
      .then((r) => setItems(r.items))
      .catch((e) => toastErreur(extraireMessageErreur(e)))
      .finally(() => setChargement(false));
  }, [origine, destination, date]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transport OD</h1>
        <p className="text-sm text-gray-500">Catalogue bus — les clients réservent depuis l&apos;app mobile.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <select value={origine} onChange={(e) => setOrigine(e.target.value)} className="h-11 rounded-champ border px-3 text-sm">
          {villes.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={destination} onChange={(e) => setDestination(e.target.value)} className="h-11 rounded-champ border px-3 text-sm">
          {villes.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-champ border px-3 text-sm" />
      </div>
      {chargement && <p className="text-gray-500">Chargement…</p>}
      <div className="space-y-2">
        {items.map((t) => (
          <Carte key={t.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold">{t.heureDepart} · {t.operateur?.nom}</p>
                <p className="text-sm text-gray-500">{t.origine} → {t.destination} · {t.confort} · {t.placesRestantes} places</p>
              </div>
              <p className="font-semibold text-primaire-700">{Number(t.prix).toLocaleString("fr-FR")} FC</p>
            </div>
          </Carte>
        ))}
        {!chargement && items.length === 0 && <p className="text-gray-500">Aucun trajet.</p>}
      </div>
    </div>
  );
}
