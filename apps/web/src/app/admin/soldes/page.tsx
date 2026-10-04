"use client";

import { useEffect, useState } from "react";
import { Scale, ChevronLeft, ChevronRight } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerSoldesPrestatairesAdmin } from "../../../lib/api-economie";
import { formaterMontant, LIBELLES_CATEGORIE } from "@reserva/shared";

export default function PageAdminSoldes() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(true);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Scale className="h-6 w-6" /> Soldes prestataires
        </h1>
        <p className="text-sm text-gray-500">Brut crédité, versé, en attente et disponible par devise.</p>
      </div>

      {chargement && <p className="text-gray-500">Chargement…</p>}
      {!chargement && items.length === 0 && (
        <Carte><p className="text-center text-gray-500">Aucun prestataire approuvé.</p></Carte>
      )}

      {!chargement && items.length > 0 && (
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
                {items.map((p) => {
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
