"use client";

import { useEffect, useMemo, useState } from "react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerVillesAdmin } from "../../../lib/api-admin";
import {
  creerTrajetAdmin,
  listerTrajetsAdmin,
  listerVillesTransport,
  modifierTrajetAdmin,
  retirerTrajetAdmin,
} from "../../../lib/api-transport";

function aujourdhuiPlus(jours: number) {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

const FORMULAIRE_VIDE = {
  operateurNom: "",
  origine: "Kinshasa",
  destination: "Matadi",
  dateDepart: aujourdhuiPlus(1),
  heureDepart: "06:00",
  dureeMinutes: "300",
  prix: "",
  placesTotales: "40",
  confort: "STANDARD",
};

type TrajetVue = {
  id: string;
  heureDepart: string;
  dateDepart: string;
  dureeMinutes: number;
  confort: string;
  prix: number;
  placesTotales: number;
  placesRestantes: number;
  origine: string;
  destination: string;
  operateurNom: string;
  actif: boolean;
};

function normaliser(trajet: any): TrajetVue {
  const placesTotales = Number(trajet.placesTotales ?? 0);
  const prises = Number(trajet.placesReservees ?? 0) + Number(trajet.placesVendues ?? 0);
  return {
    id: trajet.id,
    heureDepart: trajet.heureDepart,
    dateDepart: trajet.dateDepart,
    dureeMinutes: Number(trajet.dureeMinutes ?? 0),
    confort: trajet.confort || "STANDARD",
    prix: Number(trajet.prix ?? 0),
    placesTotales,
    placesRestantes: Math.max(0, placesTotales - prises),
    origine: trajet.ligne?.origine ?? trajet.origine ?? "",
    destination: trajet.ligne?.destination ?? trajet.destination ?? "",
    operateurNom: trajet.operateur?.nom ?? "",
    actif: trajet.actif !== false,
  };
}

export default function PageAdminTransport() {
  const [villes, setVilles] = useState<string[]>([]);
  const [origine, setOrigine] = useState("Kinshasa");
  const [destination, setDestination] = useState("Matadi");
  const [date, setDate] = useState(aujourdhuiPlus(1));
  const [items, setItems] = useState<TrajetVue[]>([]);
  const [chargement, setChargement] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [form, setForm] = useState(FORMULAIRE_VIDE);

  useEffect(() => {
    Promise.all([
      listerVillesAdmin().catch(() => [] as string[]),
      listerVillesTransport().catch(() => [] as string[]),
    ]).then(([referentiel, lignes]) => {
      const ensemble = new Set<string>([...referentiel, ...lignes]);
      const liste = [...ensemble].sort((a, b) => a.localeCompare(b, "fr"));
      setVilles(liste);
      if (liste.includes("Kinshasa")) setOrigine("Kinshasa");
      if (liste.includes("Matadi")) setDestination("Matadi");
    });
  }, []);

  useEffect(() => {
    setChargement(true);
    listerTrajetsAdmin(date)
      .then((liste) => setItems((Array.isArray(liste) ? liste : []).map(normaliser)))
      .catch((e) => toastErreur(extraireMessageErreur(e)))
      .finally(() => setChargement(false));
  }, [date]);

  const visibles = useMemo(
    () => items.filter((t) => t.origine === origine && t.destination === destination),
    [items, origine, destination],
  );

  function champ(cle: keyof typeof form, valeur: string) {
    setForm((actuel) => ({ ...actuel, [cle]: valeur }));
  }

  function editer(trajet: TrajetVue) {
    setEditionId(trajet.id);
    setForm({
      operateurNom: trajet.operateurNom,
      origine: trajet.origine,
      destination: trajet.destination,
      dateDepart: trajet.dateDepart,
      heureDepart: trajet.heureDepart,
      dureeMinutes: String(trajet.dureeMinutes),
      prix: String(trajet.prix),
      placesTotales: String(trajet.placesTotales),
      confort: trajet.confort,
    });
  }

  async function recharger(jour = date) {
    const liste = await listerTrajetsAdmin(jour);
    setItems((Array.isArray(liste) ? liste : []).map(normaliser));
  }

  async function enregistrer() {
    const saisie = {
      operateurNom: form.operateurNom.trim(),
      origine: form.origine,
      destination: form.destination,
      dateDepart: form.dateDepart,
      heureDepart: form.heureDepart,
      dureeMinutes: Number(form.dureeMinutes),
      prix: Number(form.prix),
      placesTotales: Number(form.placesTotales),
      confort: form.confort,
    };
    setEnregistrement(true);
    try {
      if (editionId) await modifierTrajetAdmin(editionId, saisie);
      else await creerTrajetAdmin(saisie);
      toastSucces(editionId ? "Trajet mis à jour" : "Trajet créé");
      setEditionId(null);
      setOrigine(saisie.origine);
      setDestination(saisie.destination);
      setDate(saisie.dateDepart);
      if (saisie.dateDepart === date) await recharger(saisie.dateDepart);
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  async function retirer(trajet: TrajetVue) {
    const message = trajet.actif
      ? `Retirer le trajet ${trajet.heureDepart} ${trajet.origine} → ${trajet.destination} ? Un trajet déjà vendu est seulement désactivé.`
      : `Réactiver le trajet ${trajet.heureDepart} ?`;
    if (!window.confirm(message)) return;
    try {
      if (trajet.actif) await retirerTrajetAdmin(trajet.id);
      else await modifierTrajetAdmin(trajet.id, { actif: true });
      toastSucces(trajet.actif ? "Trajet retiré" : "Trajet réactivé");
      await recharger();
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    }
  }

  const choix = villes.length > 0 ? villes : [origine, destination];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transport OD</h1>
        <p className="text-sm text-gray-500">Catalogue bus — les clients réservent depuis l&apos;app mobile.</p>
      </div>

      <Carte>
        <p className="mb-3 font-semibold text-gray-900">{editionId ? "Modifier le trajet" : "Nouveau trajet"}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input value={form.operateurNom} onChange={(e) => champ("operateurNom", e.target.value)} placeholder="Opérateur" className="h-11 rounded-champ border px-3 text-sm" />
          <select value={form.origine} onChange={(e) => champ("origine", e.target.value)} className="h-11 rounded-champ border bg-white px-3 text-sm">
            {choix.map((v) => <option key={`o-${v}`} value={v}>{v}</option>)}
          </select>
          <select value={form.destination} onChange={(e) => champ("destination", e.target.value)} className="h-11 rounded-champ border bg-white px-3 text-sm">
            {choix.map((v) => <option key={`d-${v}`} value={v}>{v}</option>)}
          </select>
          <input type="date" value={form.dateDepart} onChange={(e) => champ("dateDepart", e.target.value)} className="h-11 rounded-champ border px-3 text-sm" />
          <input type="time" value={form.heureDepart} onChange={(e) => champ("heureDepart", e.target.value)} className="h-11 rounded-champ border px-3 text-sm" />
          <input value={form.dureeMinutes} onChange={(e) => champ("dureeMinutes", e.target.value)} placeholder="Durée (minutes)" inputMode="numeric" className="h-11 rounded-champ border px-3 text-sm" />
          <input value={form.prix} onChange={(e) => champ("prix", e.target.value)} placeholder="Prix CDF" inputMode="decimal" className="h-11 rounded-champ border px-3 text-sm" />
          <input value={form.placesTotales} onChange={(e) => champ("placesTotales", e.target.value)} placeholder="Places" inputMode="numeric" className="h-11 rounded-champ border px-3 text-sm" />
          <select value={form.confort} onChange={(e) => champ("confort", e.target.value)} className="h-11 rounded-champ border bg-white px-3 text-sm">
            <option value="STANDARD">Standard</option>
            <option value="VIP">VIP</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <Bouton onClick={enregistrer} chargement={enregistrement}>{editionId ? "Enregistrer" : "Créer"}</Bouton>
          {editionId && (
            <Bouton variante="fantome" onClick={() => { setEditionId(null); setForm({ ...FORMULAIRE_VIDE, dateDepart: date, origine, destination }); }}>
              Annuler
            </Bouton>
          )}
        </div>
      </Carte>

      <div className="flex flex-wrap gap-3">
        <select value={origine} onChange={(e) => setOrigine(e.target.value)} className="h-11 rounded-champ border px-3 text-sm">
          {choix.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={destination} onChange={(e) => setDestination(e.target.value)} className="h-11 rounded-champ border px-3 text-sm">
          {choix.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-champ border px-3 text-sm" />
      </div>
      {chargement && <p className="text-gray-500">Chargement…</p>}
      <div className="space-y-2">
        {visibles.map((t) => (
          <Carte key={t.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold">{t.heureDepart} · {t.operateurNom}</p>
                <p className="text-sm text-gray-500">{t.origine} → {t.destination} · {t.confort} · {t.placesRestantes} places</p>
                {t.actif === false && <p className="text-xs font-medium text-amber-700">Désactivé</p>}
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-primaire-700">{t.prix.toLocaleString("fr-FR")} FC</p>
                <Bouton variante="fantome" taille="sm" onClick={() => editer(t)}>Modifier</Bouton>
                <Bouton variante="fantome" taille="sm" onClick={() => retirer(t)}>{t.actif ? "Retirer" : "Réactiver"}</Bouton>
              </div>
            </div>
          </Carte>
        ))}
        {!chargement && visibles.length === 0 && <p className="text-gray-500">Aucun trajet.</p>}
      </div>
    </div>
  );
}
