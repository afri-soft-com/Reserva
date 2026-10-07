"use client";

import { useEffect, useState } from "react";
import { CreditCard, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerConfigsTarifAdmin, creerOuModifierConfigTarifAdmin, supprimerConfigTarifAdmin } from "../../../lib/api-admin";

const TYPE_LABEL: Record<string, string> = { TEXTE: "Texte", NOMBRE: "Nombre", POURCENT: "Pourcentage", MONTANT: "Montant" };

const PRESETS = [
  { cle: "COMMISSION_PRESTATAIRE", valeur: "5", type: "POURCENT", description: "Commission prestataire par défaut (%)" },
  { cle: "TAUX_USD_CDF", valeur: "2800", type: "NOMBRE", description: "Taux de change USD → CDF" },
  { cle: "FRAIS_SERVICE_SEUIL_USD", valeur: "50", type: "MONTANT", description: "Seuil d'application des frais de service (USD)" },
  { cle: "FRAIS_SERVICE_MONTANT_USD", valeur: "2", type: "MONTANT", description: "Frais de service en USD" },
  { cle: "FRAIS_SERVICE_MONTANT_CDF", valeur: "5000", type: "MONTANT", description: "Frais de service en CDF" },
  { cle: "VERSEMENT_MINIMUM_CDF", valeur: "20000", type: "MONTANT", description: "Montant minimum de versement (CDF)" },
  { cle: "VERSEMENT_MINIMUM_USD", valeur: "10", type: "MONTANT", description: "Montant minimum de versement (USD)" },
  { cle: "POINTS_PARRAINAGE", valeur: "200", type: "NOMBRE", description: "Points crédités au parrain" },
  { cle: "VALEUR_POINT_CDF", valeur: "50", type: "MONTANT", description: "Valeur d'1 point fidélité (CDF)" },
  { cle: "POINTS_TRANCHE_CDF", valeur: "1000", type: "MONTANT", description: "1 point tous les X CDF payés" },
  { cle: "COMMISSION_AGENT", valeur: "2", type: "POURCENT", description: "Commission agent de quartier (%)" },
  { cle: "PUB_CPM_CDF", valeur: "5000", type: "MONTANT", description: "Tarif pub CPM / 1000 impressions (CDF)" },
  { cle: "PUB_CPC_CDF", valeur: "200", type: "MONTANT", description: "Tarif pub CPC / clic (CDF)" },
  { cle: "PUB_FORFAIT_CDF", valeur: "50000", type: "MONTANT", description: "Forfait campagne pub défaut (CDF)" },
];

export default function PageAdminTarifications() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [form, setForm] = useState({ cle: "", valeur: "", description: "", type: "TEXTE" });

  useEffect(() => { charger(); }, [page]);

  async function charger() {
    setChargement(true);
    try {
      const r = await listerConfigsTarifAdmin(page);
      setConfigs(r.items);
      setTotalPages(r.totalPages);
    } catch (e) { toastErreur(extraireMessageErreur(e)); }
    finally { setChargement(false); }
  }

  async function sauvegarder() {
    try {
      await creerOuModifierConfigTarifAdmin({
        cle: form.cle, valeur: form.valeur, description: form.description || undefined, type: form.type,
      });
      toastSucces("Configuration enregistrée");
      setModalOuvert(false);
      setForm({ cle: "", valeur: "", description: "", type: "TEXTE" });
      charger();
    } catch (e) { toastErreur(extraireMessageErreur(e)); }
  }

  async function supprimer(id: string) {
    if (!confirm("Supprimer cette configuration ?")) return;
    try {
      await supprimerConfigTarifAdmin(id);
      toastSucces("Configuration supprimée");
      charger();
    } catch (e) { toastErreur(extraireMessageErreur(e)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <CreditCard className="h-6 w-6" /> Tarifications
          </h1>
          <p className="text-sm text-gray-500">
            Commission, frais clients, parrainage, fidélité, agents, tarifs pubs — tout réglable ici.
          </p>
        </div>
        <Bouton taille="sm" onClick={() => setModalOuvert(true)}><Plus className="h-4 w-4" /> Ajouter</Bouton>
      </div>

      <Carte>
        <p className="mb-2 text-sm font-medium text-gray-700">Presets économiques</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.cle}
              type="button"
              onClick={() => {
                setForm({ cle: p.cle, valeur: p.valeur, description: p.description, type: p.type });
                setModalOuvert(true);
              }}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:border-primaire hover:text-primaire"
            >
              {p.cle}
            </button>
          ))}
        </div>
      </Carte>

      {chargement && <p className="text-gray-500">Chargement...</p>}

      {!chargement && configs.length === 0 && (
        <Carte><p className="text-center text-gray-500">Aucune configuration de tarification.</p></Carte>
      )}

      {!chargement && configs.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <table className="w-full bg-white text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Clé</th>
                  <th className="px-4 py-3">Valeur</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{c.cle}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{c.valeur}</td>
                    <td className="px-4 py-3 text-gray-600">{TYPE_LABEL[c.type] || c.type}</td>
                    <td className="px-4 py-3 text-gray-600">{c.description || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.actif ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                        {c.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Bouton variante="destructif" taille="sm" onClick={() => supprimer(c.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Bouton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Bouton variante="fantome" taille="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Bouton>
            <span className="text-sm text-gray-500">Page {page} sur {totalPages}</span>
            <Bouton variante="fantome" taille="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Suivant <ChevronRight className="h-4 w-4" />
            </Bouton>
          </div>
        </>
      )}

      {modalOuvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalOuvert(false)}>
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-gray-900">Nouvelle configuration</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Clé *</label>
                <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" value={form.cle} onChange={e => setForm({ ...form, cle: e.target.value })} placeholder="Ex: COMMISSION_DEFAUT" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Valeur *</label>
                <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.valeur} onChange={e => setForm({ ...form, valeur: e.target.value })} placeholder="Ex: 4" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="TEXTE">Texte</option>
                    <option value="NOMBRE">Nombre</option>
                    <option value="POURCENT">Pourcentage</option>
                    <option value="MONTANT">Montant</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: Commission par défaut sur les réservations" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Bouton variante="fantome" onClick={() => setModalOuvert(false)}>Annuler</Bouton>
              <Bouton onClick={sauvegarder}>Enregistrer</Bouton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
