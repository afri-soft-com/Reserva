"use client";

import { useEffect, useState } from "react";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur } from "../../../components/Toast";
import { clientApi, extraireMessageErreur } from "../../../lib/api-client";

export default function PageAdminAudits() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    clientApi
      .get("/admin/audits", { params: { page } })
      .then(({ data }) => {
        setItems(data.donnees.items);
        setTotalPages(data.donnees.totalPages);
      })
      .catch((e) => toastErreur(extraireMessageErreur(e)))
      .finally(() => setChargement(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ScrollText className="h-6 w-6" /> Audit admin
        </h1>
        <p className="text-sm text-gray-500">Journal des actions sensibles (suspensions, versements…).</p>
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
