"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, MapPin, Hotel } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { HotelResume, listerHotelsAdmin, listerVillesHotels } from "../../../lib/api-hotels";
import { formaterMontant } from "@reserva/shared";

export default function PageAdminHotels() {
  const [hotels, setHotels] = useState<HotelResume[]>([]);
  const [villes, setVilles] = useState<string[]>([]);
  const [ville, setVille] = useState("");
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    listerVillesHotels().then(setVilles).catch(() => undefined);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Hotel className="h-6 w-6" /> Catalogue hôtels
        </h1>
        <p className="text-sm text-gray-500">
          Inventaire du microservice hotels. Les clients réservent depuis l&apos;app mobile.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Carte><p className="text-xs text-gray-500">Hôtels</p><p className="text-xl font-bold">{stats.total}</p></Carte>
        <Carte><p className="text-xs text-gray-500">Villes</p><p className="text-xl font-bold">{stats.villes}</p></Carte>
        <Carte><p className="text-xs text-gray-500">Étoiles moy.</p><p className="text-xl font-bold">{stats.etoilesMoy.toFixed(1)}</p></Carte>
        <Carte><p className="text-xs text-gray-500">Note moy.</p><p className="text-xl font-bold">{stats.noteMoy.toFixed(1)}</p></Carte>
      </div>

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
            <p className="mt-2 text-xs text-gray-500">
              {"★".repeat(h.etoiles)} · {h.nombreChambresDispo ?? 0} types de chambres · {h.nombreAvis} avis
            </p>
            {h.prixDepuis != null && (
              <p className="mt-2 font-semibold text-primaire-700">
                Dès {formaterMontant(h.prixDepuis, (h.devise as "USD" | "CDF") || "USD")}
              </p>
            )}
          </Carte>
        ))}
      </div>
    </div>
  );
}
