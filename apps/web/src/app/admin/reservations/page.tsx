"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerReservationsAdmin } from "../../../lib/api-admin";
import { formaterMontant } from "@reserva/shared";

export default function PageAdminReservations() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statut, setStatut] = useState("");
  const [statutPaiement, setStatutPaiement] = useState("");
  const [recherche, setRecherche] = useState("");
  const [q, setQ] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    listerReservationsAdmin({
      page,
      statut: statut || undefined,
      statutPaiement: statutPaiement || undefined,
      recherche: q || undefined,
    })
      .then((r) => {
        setItems(r.items);
        setTotalPages(r.totalPages);
        setTotal(r.total);
      })
      .catch((e) => toastErreur(extraireMessageErreur(e)))
      .finally(() => setChargement(false));
  }, [page, statut, statutPaiement, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <CalendarCheck className="h-6 w-6" /> Réservations
        </h1>
        <p className="text-sm text-gray-500">{total} réservation(s) santé / restauration / hôtellerie (core).</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); setQ(recherche.trim()); } }}
            placeholder="N°, client, téléphone, prestataire…"
            className="h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm"
          />
        </div>
        <Bouton taille="sm" onClick={() => { setPage(1); setQ(recherche.trim()); }}>Rechercher</Bouton>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={statut} onChange={(e) => { setPage(1); setStatut(e.target.value); }}>
          <option value="">Tous statuts</option>
          <option value="EN_ATTENTE">En attente</option>
          <option value="CONFIRMEE">Confirmée</option>
          <option value="TERMINEE">Terminée</option>
          <option value="ANNULEE">Annulée</option>
          <option value="REFUSEE">Refusée</option>
        </select>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={statutPaiement} onChange={(e) => { setPage(1); setStatutPaiement(e.target.value); }}>
          <option value="">Tous paiements</option>
          <option value="EN_ATTENTE">En attente</option>
          <option value="PAYE">Payé</option>
          <option value="PARTIEL">Partiel</option>
          <option value="REMBOURSE">Remboursé</option>
        </select>
      </div>

      {chargement && <p className="text-gray-500">Chargement…</p>}
      {!chargement && items.length === 0 && (
        <Carte><p className="text-center text-gray-500">Aucune réservation.</p></Carte>
      )}

      {!chargement && items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">N°</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Prestataire</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Créneau</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Paiement</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Commission</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{r.numero}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.client?.nom}</p>
                      <p className="text-xs text-gray-500">{r.client?.telephone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{r.prestataire?.nomEntreprise}</p>
                      <p className="text-xs text-gray-500">{r.prestataire?.ville}</p>
                    </td>
                    <td className="px-4 py-3">{r.service?.nom}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {r.creneau?.debut ? new Date(r.creneau.debut).toLocaleString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">{r.statut}</td>
                    <td className="px-4 py-3 text-xs">{r.statutPaiement}</td>
                    <td className="px-4 py-3 font-semibold">{formaterMontant(r.montantTotal, r.devise)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {formaterMontant(r.montantCommission || 0, r.devise)}
                    </td>
                  </tr>
                ))}
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
