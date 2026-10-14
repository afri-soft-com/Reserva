"use client";

import { useEffect, useState } from "react";
import { ScrollText, ChevronLeft, ChevronRight, Search, Printer } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur } from "../../../components/Toast";
import { clientApi, extraireMessageErreur } from "../../../lib/api-client";
import { imprimerElement, tableVersHtml } from "../../../lib/impression";

export default function PageAdminAudits() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    setChargement(true);
    clientApi
      .get("/admin/audits", {
        params: {
          page,
          recherche: q || undefined,
          action: action || undefined,
        },
      })
      .then(({ data }) => {
        setItems(data.donnees.items);
        setTotalPages(data.donnees.totalPages);
        setTotal(data.donnees.total ?? data.donnees.items?.length ?? 0);
      })
      .catch((e) => toastErreur(extraireMessageErreur(e)))
      .finally(() => setChargement(false));
  }, [page, q, action]);

  function imprimer() {
    imprimerElement(
      "Journal d'audit",
      tableVersHtml(
        ["Date", "Action", "Cible", "Admin", "Détails"],
        items.map((a) => [
          a.creeLe ? new Date(a.creeLe).toLocaleString("fr-FR") : "—",
          a.action || "—",
          `${a.cibleType || "—"} ${a.cibleId ? String(a.cibleId).slice(0, 12) : ""}`.trim(),
          a.adminId ? String(a.adminId).slice(0, 12) : "—",
          typeof a.details === "string" ? a.details : a.details ? JSON.stringify(a.details) : "—",
        ])
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ScrollText className="h-6 w-6" /> Audit admin
          </h1>
          <p className="text-sm text-gray-500">
            {total} entrée(s) — journal des actions sensibles (suspensions, versements…).
          </p>
        </div>
        <Bouton variante="fantome" taille="sm" onClick={imprimer} disabled={items.length === 0}>
          <Printer className="h-4 w-4" /> Imprimer
        </Bouton>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                setQ(recherche.trim());
              }
            }}
            placeholder="Action, cible, admin, détails…"
            className="h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm"
          />
        </div>
        <Bouton
          taille="sm"
          onClick={() => {
            setPage(1);
            setQ(recherche.trim());
          }}
        >
          Rechercher
        </Bouton>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
        >
          <option value="">Toutes actions</option>
          <option value="SUSPENDRE">Suspendre</option>
          <option value="BLOQUER">Bloquer</option>
          <option value="VERSEMENT">Versement</option>
          <option value="UTILISATEUR">Utilisateur</option>
          <option value="PLAN">Plan / abo</option>
        </select>
      </div>

      {chargement && <p className="text-gray-500">Chargement…</p>}
      {!chargement && items.length === 0 && (
        <Carte><p className="text-center text-gray-500">Aucune entrée d&apos;audit.</p></Carte>
      )}
      {!chargement && items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Cible</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Détails</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(a.creeLe).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 font-medium">{a.action}</td>
                    <td className="px-4 py-3 text-xs">
                      {a.cibleType || "—"} {a.cibleId ? `· ${String(a.cibleId).slice(0, 8)}…` : ""}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{String(a.adminId).slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[220px] truncate">{a.details || "—"}</td>
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
