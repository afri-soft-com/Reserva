"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, MapPin, Hotel, Printer } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerVillesAdmin } from "../../../lib/api-admin";
import {
  HotelResume,
  creerHotelAdmin,
  listerHotelsAdmin,
  listerVillesHotels,
  modifierHotelAdmin,
  retirerHotelAdmin,
} from "../../../lib/api-hotels";
import { formaterMontant } from "@reserva/shared";
import { imprimerElement, tableVersHtml } from "../../../lib/impression";

export default function PageAdminHotels() {
  const [hotels, setHotels] = useState<HotelResume[]>([]);
  const [villes, setVilles] = useState<string[]>([]);
  const [ville, setVille] = useState("");
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [villesForm, setVillesForm] = useState<string[]>([]);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    ville: "",
    quartier: "",
    adresse: "",
    telephone: "",
    description: "",
    etoiles: "3",
    prixParNuit: "",
    devise: "USD",
  });

  useEffect(() => {
    listerVillesHotels().then(setVilles).catch(() => undefined);
    listerVillesAdmin().then(setVillesForm).catch(() => undefined);
  }, []);

  useEffect(() => {
    setChargement(true);
    listerHotelsAdmin(ville || undefined)
      .then((r) => setHotels(r.items))
      .catch((e) => toastErreur(extraireMessageErreur(e)))
      .finally(() => setChargement(false));
  }, [ville]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter(
      (h) =>
        h.nom.toLowerCase().includes(q) ||
        h.quartier.toLowerCase().includes(q) ||
        h.ville.toLowerCase().includes(q)
    );
  }, [hotels, recherche]);

  const stats = useMemo(() => {
    const etoilesMoy =
      hotels.length > 0 ? hotels.reduce((s, h) => s + h.etoiles, 0) / hotels.length : 0;
    const noteMoy =
      hotels.length > 0 ? hotels.reduce((s, h) => s + h.noteMoyenne, 0) / hotels.length : 0;
    return {
      total: hotels.length,
      villes: new Set(hotels.map((h) => h.ville)).size,
      etoilesMoy,
      noteMoy,
    };
  }, [hotels]);

  function champ(cle: keyof typeof form, valeur: string) {
    setForm((actuel) => ({ ...actuel, [cle]: valeur }));
  }

  function editer(hotel: HotelResume) {
    setEditionId(hotel.id);
    setForm({
      nom: hotel.nom,
      ville: hotel.ville,
      quartier: hotel.quartier,
      adresse: hotel.adresse ?? "",
      telephone: hotel.telephone ?? "",
      description: hotel.description ?? "",
      etoiles: String(hotel.etoiles || 3),
      prixParNuit: hotel.prixDepuis != null ? String(hotel.prixDepuis) : "",
      devise: hotel.devise === "CDF" ? "CDF" : "USD",
    });
  }

  function reinitialiser() {
    setEditionId(null);
    setForm({
      nom: "",
      ville: "",
      quartier: "",
      adresse: "",
      telephone: "",
      description: "",
      etoiles: "3",
      prixParNuit: "",
      devise: "USD",
    });
  }

  async function enregistrer() {
    const prix = Number(form.prixParNuit);
    const saisie = {
      nom: form.nom.trim(),
      ville: form.ville.trim(),
      quartier: form.quartier.trim(),
      adresse: form.adresse.trim(),
      telephone: form.telephone.trim(),
      description: form.description.trim(),
      etoiles: Number(form.etoiles) || 3,
      devise: form.devise,
      ...(Number.isFinite(prix) && prix > 0 ? { prixParNuit: prix } : {}),
    };
    setEnregistrement(true);
    try {
      if (editionId) await modifierHotelAdmin(editionId, saisie);
      else await creerHotelAdmin(saisie);
      toastSucces(editionId ? "Hôtel mis à jour" : "Hôtel créé");
      reinitialiser();
      const r = await listerHotelsAdmin(ville || undefined);
      setHotels(r.items);
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  async function retirer(hotel: HotelResume) {
    const message = hotel.actif === false
      ? `Réactiver ${hotel.nom} ?`
      : `Retirer ${hotel.nom} du catalogue ? Les séjours déjà réservés restent en historique.`;
    if (!window.confirm(message)) return;
    try {
      if (hotel.actif === false) await modifierHotelAdmin(hotel.id, { actif: true });
      else await retirerHotelAdmin(hotel.id);
      toastSucces(hotel.actif === false ? "Hôtel réactivé" : "Hôtel retiré du catalogue");
      const r = await listerHotelsAdmin(ville || undefined);
      setHotels(r.items);
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    }
  }

  function imprimer() {
    imprimerElement(
      "Catalogue hôtels",
      tableVersHtml(
        ["Nom", "Ville", "Quartier", "Étoiles", "Note", "Prix dès"],
        filtres.map((h) => [
          h.nom,
          h.ville,
          h.quartier,
          String(h.etoiles),
          h.noteMoyenne.toFixed(1),
          h.prixDepuis != null
            ? formaterMontant(h.prixDepuis, (h.devise as "USD" | "CDF") || "USD")
            : "—",
        ])
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Hotel className="h-6 w-6" /> Catalogue hôtels
          </h1>
          <p className="text-sm text-gray-500">
            Inventaire du microservice hotels. Les clients réservent depuis l&apos;app mobile.
          </p>
        </div>
        <Bouton variante="fantome" taille="sm" onClick={imprimer} disabled={filtres.length === 0}>
          <Printer className="h-4 w-4" /> Imprimer
        </Bouton>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Carte><p className="text-xs text-gray-500">Hôtels</p><p className="text-xl font-bold">{stats.total}</p></Carte>
        <Carte><p className="text-xs text-gray-500">Villes</p><p className="text-xl font-bold">{stats.villes}</p></Carte>
        <Carte><p className="text-xs text-gray-500">Étoiles moy.</p><p className="text-xl font-bold">{stats.etoilesMoy.toFixed(1)}</p></Carte>
        <Carte><p className="text-xs text-gray-500">Note moy.</p><p className="text-xl font-bold">{stats.noteMoy.toFixed(1)}</p></Carte>
      </div>

      <Carte>
        <p className="mb-3 font-semibold text-gray-900">{editionId ? "Modifier l'hôtel" : "Nouvel hôtel"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.nom} onChange={(e) => champ("nom", e.target.value)} placeholder="Nom" className="h-11 rounded-champ border border-gray-300 px-3 text-sm" />
          <select value={form.ville} onChange={(e) => champ("ville", e.target.value)} className="h-11 rounded-champ border border-gray-300 bg-white px-3 text-sm">
            <option value="">Ville</option>
            {[...new Set([...(villesForm.length > 0 ? villesForm : villes), form.ville].filter(Boolean))].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <input value={form.quartier} onChange={(e) => champ("quartier", e.target.value)} placeholder="Quartier" className="h-11 rounded-champ border border-gray-300 px-3 text-sm" />
          <input value={form.adresse} onChange={(e) => champ("adresse", e.target.value)} placeholder="Adresse" className="h-11 rounded-champ border border-gray-300 px-3 text-sm" />
          <input value={form.telephone} onChange={(e) => champ("telephone", e.target.value)} placeholder="Téléphone" className="h-11 rounded-champ border border-gray-300 px-3 text-sm" />
          <div className="flex gap-2">
            <select value={form.etoiles} onChange={(e) => champ("etoiles", e.target.value)} className="h-11 rounded-champ border border-gray-300 bg-white px-3 text-sm">
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} étoile{n > 1 ? "s" : ""}</option>)}
            </select>
            <input value={form.prixParNuit} onChange={(e) => champ("prixParNuit", e.target.value)} placeholder="Prix / nuit" inputMode="decimal" className="h-11 min-w-0 flex-1 rounded-champ border border-gray-300 px-3 text-sm" />
            <select value={form.devise} onChange={(e) => champ("devise", e.target.value)} className="h-11 rounded-champ border border-gray-300 bg-white px-3 text-sm">
              <option value="USD">USD</option>
              <option value="CDF">CDF</option>
            </select>
          </div>
          <textarea value={form.description} onChange={(e) => champ("description", e.target.value)} placeholder="Description" className="min-h-[44px] rounded-champ border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
        </div>
        <div className="mt-3 flex gap-2">
          <Bouton onClick={enregistrer} chargement={enregistrement}>{editionId ? "Enregistrer" : "Créer"}</Bouton>
          {editionId && <Bouton variante="fantome" onClick={reinitialiser}>Annuler</Bouton>}
        </div>
      </Carte>

      <div className="flex flex-wrap gap-3">
        <select
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          className="h-11 rounded-champ border border-gray-300 bg-white px-3 text-sm"
        >
          <option value="">Toutes les villes</option>
          {villes.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Filtrer par nom / quartier…"
          className="h-11 min-w-[220px] flex-1 rounded-champ border border-gray-300 px-3 text-sm"
        />
      </div>

      {chargement && <p className="text-gray-500">Chargement…</p>}
      {!chargement && filtres.length === 0 && (
        <Carte><p className="text-center text-gray-500">Aucun hôtel.</p></Carte>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {filtres.map((h) => (
          <Carte key={h.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900">{h.nom}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="h-3.5 w-3.5" /> {h.ville}, {h.quartier}
                </p>
              </div>
              <span className="flex items-center gap-1 text-sm text-gray-600">
                <Star className="h-4 w-4 fill-accent text-accent" /> {h.noteMoyenne.toFixed(1)}
              </span>
            </div>
            {h.actif === false && <p className="mt-1 text-xs font-medium text-amber-700">Retiré du catalogue</p>}
            <p className="mt-2 text-xs text-gray-500">
              {"★".repeat(h.etoiles)} · {h.nombreChambresDispo ?? 0} types de chambres · {h.nombreAvis} avis
            </p>
            {h.prixDepuis != null && (
              <p className="mt-2 font-semibold text-primaire-700">
                Dès {formaterMontant(h.prixDepuis, (h.devise as "USD" | "CDF") || "USD")}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Bouton variante="fantome" taille="sm" onClick={() => editer(h)}>Modifier</Bouton>
              <Bouton variante="fantome" taille="sm" onClick={() => retirer(h)}>{h.actif === false ? "Réactiver" : "Retirer"}</Bouton>
            </div>
          </Carte>
        ))}
      </div>
    </div>
  );
}
