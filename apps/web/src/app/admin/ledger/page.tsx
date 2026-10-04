"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerEcrituresAdmin } from "../../../lib/api-economie";
import { formaterMontant } from "@reserva/shared";

const TYPES = ["", "COMMISSION", "FRAIS_SERVICE", "NET_PRESTATAIRE", "ABONNEMENT", "VERSEMENT", "REMBOURSEMENT"];
const COMPTES = ["", "PLATEFORME", "PRESTATAIRE"];

export default function PageAdminLedger() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState("");
  const [compte, setCompte] = useState("");
  const [devise, setDevise] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => { charger(); }, [page, type, compte, devise]);

  async function charger() {
    setChargement(true);
    try {
      const r = await listerEcrituresAdmin({
        page,
        type: type || undefined,
        compte: compte || undefined,
        devise: devise || undefined,
      });
      setItems(r.items);
      setTotalPages(r.totalPages);
      setTotal(r.total);
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BookOpen className="h-6 w-6" /> Journal comptable
        </h1>
        <p className="text-sm text-gray-500">{total} écriture(s) — double entrée plateforme / prestataire.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={type} onChange={(e) => { setPage(1); setType(e.target.value); }}>
          <option value="">Tous les types</option>
          {TYPES.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={compte} onChange={(e) => { setPage(1); setCompte(e.target.value); }}>
          <option value="">Tous les comptes</option>
          {COMPTES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={devise} onChange={(e) => { setPage(1); setDevise(e.target.value); }}>
          <option value="">Toutes devises</option>
          <option value="CDF">CDF</option>
          <option value="USD">USD</option>
        </select>
      </div>

      {chargement && <p className="text-gray-500">Chargement…</p>}
      {!chargement && items.length === 0 && (
        <Carte><p className="text-center text-gray-500">Aucune écriture.</p></Carte>
      )}

      {!chargement && items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Compte</th>
                  <th className="px-4 py-3">Sens</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Réservation</th>
                  <th className="px-4 py-3">Prestataire</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(e.creeLe).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 font-medium">{e.type}</td>
                    <td className="px-4 py-3">{e.compte}</td>
                    <td className="px-4 py-3">
                      <span className={e.sens === "CREDIT" ? "text-emerald-600" : "text-red-600"}>{e.sens}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formaterMontant(e.montant, e.devise)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.reservation?.numero || "—"}</td>
                    <td className="px-4 py-3">{e.prestataire?.nomEntreprise || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{e.description || "—"}</td>
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
