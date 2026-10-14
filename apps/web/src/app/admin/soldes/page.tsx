"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale, ChevronLeft, ChevronRight, Search, Printer } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerSoldesPrestatairesAdmin } from "../../../lib/api-economie";
import { formaterMontant, LIBELLES_CATEGORIE } from "@reserva/shared";
import { imprimerElement, tableVersHtml } from "../../../lib/impression";

export default function PageAdminSoldes() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    setChargement(true);
    listerSoldesPrestatairesAdmin(page)
      .then((r) => {
        setItems(r.items);
        setTotalPages(r.totalPages);
      })
      .catch((e) => toastErreur(extraireMessageErreur(e)))
      .finally(() => setChargement(false));
  }, [page]);

  const itemsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.nomEntreprise?.toLowerCase().includes(q) ||
        p.ville?.toLowerCase().includes(q) ||
        (p.categorie || "").toLowerCase().includes(q)
    );
  }, [items, recherche]);

  function imprimer() {
    imprimerElement(
      "Soldes prestataires",
      tableVersHtml(
        ["Prestataire", "Ville", "Disponible CDF", "Disponible USD", "En attente"],
        itemsFiltres.map((p) => {
          const cdf = p.soldes?.find((s: any) => s.devise === "CDF");
          const usd = p.soldes?.find((s: any) => s.devise === "USD");
          return [
            p.nomEntreprise || "—",
            p.ville || "—",
            formaterMontant(cdf?.disponible ?? 0, "CDF"),
            formaterMontant(usd?.disponible ?? 0, "USD"),
            `${formaterMontant(cdf?.enAttente ?? 0, "CDF")}${
              (usd?.enAttente ?? 0) > 0 ? ` · ${formaterMontant(usd.enAttente, "USD")}` : ""
            }`,
          ];
        })
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Scale className="h-6 w-6" /> Soldes prestataires
          </h1>
          <p className="text-sm text-gray-500">Brut crédité, versé, en attente et disponible par devise.</p>
        </div>
        <Bouton variante="fantome" taille="sm" onClick={imprimer} disabled={itemsFiltres.length === 0}>
          <Printer className="h-4 w-4" /> Imprimer
        </Bouton>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Nom, ville, catégorie…"
          className="h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm"
        />
      </div>

      {chargement && <p className="text-gray-500">Chargement…</p>}
      {!chargement && itemsFiltres.length === 0 && (
        <Carte><p className="text-center text-gray-500">Aucun prestataire approuvé.</p></Carte>
      )}

      {!chargement && itemsFiltres.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">Prestataire</th>
                  <th className="px-4 py-3">Ville</th>
                  <th className="px-4 py-3">Disponible CDF</th>
                  <th className="px-4 py-3">Disponible USD</th>
                  <th className="px-4 py-3">En attente</th>
                </tr>
              </thead>
              <tbody>
                {itemsFiltres.map((p) => {
                  const cdf = p.soldes?.find((s: any) => s.devise === "CDF");
                  const usd = p.soldes?.find((s: any) => s.devise === "USD");
                  return (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.nomEntreprise}</p>
                        <p className="text-xs text-gray-500">
                          {(LIBELLES_CATEGORIE as any)[p.categorie] || p.categorie}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.ville}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        {formaterMontant(cdf?.disponible ?? 0, "CDF")}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        {formaterMontant(usd?.disponible ?? 0, "USD")}
                      </td>
                      <td className="px-4 py-3 text-amber-700">
                        {formaterMontant(cdf?.enAttente ?? 0, "CDF")}
                        {(usd?.enAttente ?? 0) > 0 && (
                          <> · {formaterMontant(usd.enAttente, "USD")}</>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page} / {totalPages}</p>
            <div className="flex gap-2">
              <Bouton taille="sm" variante="secondaire" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Bouton>
              <Bouton taille="sm" variante="secondaire" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Bouton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
