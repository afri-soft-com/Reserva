"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Wallet, Search, Printer } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerVersementsAdmin, traiterVersementAdmin } from "../../../lib/api-economie";
import { formaterMontant } from "@reserva/shared";
import { imprimerElement, tableVersHtml } from "../../../lib/impression";

export default function PageAdminVersements() {
  const [items, setItems] = useState<any[]>([]);
  const [statut, setStatut] = useState("DEMANDE");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [payerMode, setPayerMode] = useState(true);
  const [recherche, setRecherche] = useState("");

  useEffect(() => { charger(); }, [statut, page]);

  const itemsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return items;
    return items.filter((v) => {
      const hay = [
        v.prestataire?.nomEntreprise,
        v.prestataire?.ville,
        v.prestataire?.categorie,
        v.operateur,
        v.telephonePaiement,
        v.referenceExterne,
        v.noteAdmin,
        String(v.montant ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, recherche]);

  async function charger() {
    setChargement(true);
    try {
      const r = await listerVersementsAdmin(page, statut || undefined);
      setItems(r.items);
      setTotalPages(r.totalPages);
      setTotal(r.total);
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setChargement(false);
    }
  }

  function imprimer() {
    imprimerElement(
      "Versements prestataires",
      tableVersHtml(
        ["Prestataire", "Montant", "Opérateur", "Téléphone", "Date", "Statut", "Réf."],
        itemsFiltres.map((v) => [
          v.prestataire?.nomEntreprise || "—",
          formaterMontant(v.montant, v.devise),
          v.operateur || "—",
          v.telephonePaiement || "—",
          new Date(v.demandeLe || v.creeLe).toLocaleDateString("fr-FR"),
          v.statut || "—",
          v.referenceExterne || v.noteAdmin || "—",
        ])
      )
    );
  }

  function ouvrirTraitement(id: string, payer: boolean) {
    setNoteId(id);
    setPayerMode(payer);
    setNote("");
  }

  async function confirmerTraitement() {
    if (!noteId) return;
    setActionId(noteId);
    try {
      await traiterVersementAdmin(noteId, { payer: payerMode, noteAdmin: note || undefined });
      toastSucces(payerMode ? "Versement marqué comme payé" : "Demande refusée");
      setNoteId(null);
      await charger();
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Wallet className="h-6 w-6" /> Versements prestataires
          </h1>
          <p className="text-sm text-gray-500">{total} demande(s) — Mobile Money / validation manuelle.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Bouton variante="fantome" taille="sm" onClick={imprimer} disabled={itemsFiltres.length === 0}>
            <Printer className="h-4 w-4" /> Imprimer
          </Bouton>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={statut}
            onChange={(e) => { setPage(1); setStatut(e.target.value); }}
          >
            <option value="DEMANDE">En attente</option>
            <option value="PAYE">Payés</option>
            <option value="REFUSE">Refusés</option>
            <option value="">Tous</option>
          </select>
        </div>
      </div>

      <div className="relative min-w-[220px] max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Prestataire, téléphone, opérateur, réf…"
          className="h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm"
        />
      </div>

      {chargement && <p className="text-gray-500">Chargement...</p>}
      {!chargement && itemsFiltres.length === 0 && (
        <Carte><p className="text-center text-gray-500">Aucune demande.</p></Carte>
      )}

      {!chargement && itemsFiltres.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">Prestataire</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Opérateur</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Réf. / note</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {itemsFiltres.map((v) => (
                  <tr key={v.id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{v.prestataire?.nomEntreprise}</p>
                      <p className="text-xs text-gray-500">{v.prestataire?.ville} · {v.prestataire?.categorie}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formaterMontant(v.montant, v.devise)}</td>
                    <td className="px-4 py-3">{v.operateur}</td>
                    <td className="px-4 py-3">{v.telephonePaiement}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(v.demandeLe || v.creeLe).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {v.referenceExterne && <p className="font-mono">{v.referenceExterne}</p>}
                      {v.noteAdmin && <p>{v.noteAdmin}</p>}
                      {!v.referenceExterne && !v.noteAdmin && "—"}
                    </td>
                    <td className="px-4 py-3">
                      {v.statut === "DEMANDE" ? (
                        <div className="flex gap-2">
                          <Bouton taille="sm" chargement={actionId === v.id} onClick={() => ouvrirTraitement(v.id, true)}>
                            Payer
                          </Bouton>
                          <Bouton taille="sm" variante="destructif" onClick={() => ouvrirTraitement(v.id, false)}>
                            Refuser
                          </Bouton>
                        </div>
                      ) : (
                        <span className={`text-xs font-medium ${v.statut === "PAYE" ? "text-emerald-600" : "text-red-600"}`}>
                          {v.statut}
                        </span>
                      )}
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

      {noteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setNoteId(null)}>
          <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-bold text-gray-900">
              {payerMode ? "Confirmer le paiement" : "Refuser la demande"}
            </h2>
            <p className="mb-3 text-sm text-gray-500">Note admin optionnelle (visible en journal interne).</p>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: virement MPESA effectué le…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Bouton variante="fantome" onClick={() => setNoteId(null)}>Annuler</Bouton>
              <Bouton
                variante={payerMode ? "primaire" : "destructif"}
                chargement={actionId === noteId}
                onClick={confirmerTraitement}
              >
                {payerMode ? "Marquer payé" : "Refuser"}
              </Bouton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
