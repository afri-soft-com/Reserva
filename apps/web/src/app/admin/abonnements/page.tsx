"use client";

import { useEffect, useState } from "react";
import { Package, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import {
  listerPlansAdmin,
  creerPlanAdmin,
  modifierPlanAdmin,
  supprimerPlanAdmin,
  listerAbonnementsAdmin,
} from "../../../lib/api-admin";
import { formaterMontant } from "@reserva/shared";

export default function PageAdminAbonnements() {
  const [onglet, setOnglet] = useState<"plans" | "souscriptions">("plans");
  const [plans, setPlans] = useState<any[]>([]);
  const [souscriptions, setSouscriptions] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSous, setPageSous] = useState(1);
  const [totalPagesSous, setTotalPagesSous] = useState(1);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [edition, setEdition] = useState<any | null>(null);
  const [form, setForm] = useState({ nom: "", description: "", prix: "", devise: "CDF", dureeJours: "30", maxServices: "", commissionReduite: "", fonctionnalites: "" });

  useEffect(() => { if (onglet === "plans") charger(); }, [page, onglet]);
  useEffect(() => { if (onglet === "souscriptions") chargerSouscriptions(); }, [pageSous, onglet]);

  async function charger() {
    setChargement(true);
    try {
      const r = await listerPlansAdmin(page);
      setPlans(r.items);
      setTotalPages(r.totalPages);
    } catch (e) { toastErreur(extraireMessageErreur(e)); }
    finally { setChargement(false); }
  }

  async function chargerSouscriptions() {
    setChargement(true);
    try {
      const r = await listerAbonnementsAdmin(pageSous);
      setSouscriptions(r.items);
      setTotalPagesSous(r.totalPages);
    } catch (e) { toastErreur(extraireMessageErreur(e)); }
    finally { setChargement(false); }
  }

  function ouvrirModal(plan?: any) {
    if (plan) {
      setEdition(plan);
      setForm({
        nom: plan.nom, description: plan.description || "", prix: plan.prix.toString(),
        devise: plan.devise, dureeJours: plan.dureeJours.toString(),
        maxServices: plan.maxServices?.toString() || "",
        commissionReduite: plan.commissionReduite?.toString() || "",
        fonctionnalites: plan.fonctionnalites || "",
      });
    } else {
      setEdition(null);
      setForm({ nom: "", description: "", prix: "", devise: "CDF", dureeJours: "30", maxServices: "", commissionReduite: "", fonctionnalites: "" });
    }
    setModalOuvert(true);
  }

  async function sauvegarder() {
    try {
      const payload = {
        nom: form.nom, description: form.description || undefined,
        prix: parseFloat(form.prix), devise: form.devise, dureeJours: parseInt(form.dureeJours),
        maxServices: form.maxServices ? parseInt(form.maxServices) : undefined,
        commissionReduite: form.commissionReduite ? parseFloat(form.commissionReduite) : undefined,
        fonctionnalites: form.fonctionnalites || undefined,
      };
      if (edition) {
        await modifierPlanAdmin(edition.id, payload);
        toastSucces("Plan modifié");
      } else {
        await creerPlanAdmin(payload);
        toastSucces("Plan créé");
      }
      setModalOuvert(false);
      charger();
    } catch (e) { toastErreur(extraireMessageErreur(e)); }
  }

  async function supprimer(id: string) {
    if (!confirm("Supprimer ce plan d'abonnement ?")) return;
    try {
      await supprimerPlanAdmin(id);
      toastSucces("Plan supprimé");
      charger();
    } catch (e) { toastErreur(extraireMessageErreur(e)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Package className="h-6 w-6" /> Abonnements
          </h1>
          <p className="text-sm text-gray-500">Plans commerciaux et souscriptions prestataires actives.</p>
        </div>
        {onglet === "plans" && (
          <Bouton taille="sm" onClick={() => ouvrirModal()}><Plus className="h-4 w-4" /> Nouveau plan</Bouton>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setOnglet("plans")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${onglet === "plans" ? "bg-primaire-50 text-primaire" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Plans
        </button>
        <button
          type="button"
          onClick={() => setOnglet("souscriptions")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${onglet === "souscriptions" ? "bg-primaire-50 text-primaire" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Souscriptions
        </button>
      </div>

      {chargement && <p className="text-gray-500">Chargement...</p>}

      {onglet === "souscriptions" && !chargement && (
        <>
          {souscriptions.length === 0 ? (
            <Carte><p className="text-center text-gray-500">Aucune souscription enregistrée.</p></Carte>
          ) : (
            <div className="overflow-x-auto rounded-card bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-gray-500">
                    <th className="px-4 py-3">Prestataire</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Début</th>
                    <th className="px-4 py-3">Fin</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {souscriptions.map((a) => (
                    <tr key={a.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-medium">{a.prestataire?.nomEntreprise}</td>
                      <td className="px-4 py-3">{a.plan?.nom}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(a.dateDebut).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(a.dateFin).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3 text-xs">{a.statut}</td>
                      <td className="px-4 py-3 font-semibold">
                        {formaterMontant(a.montantPaye ?? a.plan?.prix ?? 0, a.plan?.devise || "CDF")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-center gap-4">
            <Bouton variante="fantome" taille="sm" disabled={pageSous <= 1} onClick={() => setPageSous((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Bouton>
            <span className="text-sm text-gray-500">Page {pageSous} sur {totalPagesSous}</span>
            <Bouton variante="fantome" taille="sm" disabled={pageSous >= totalPagesSous} onClick={() => setPageSous((p) => p + 1)}>
              Suivant <ChevronRight className="h-4 w-4" />
            </Bouton>
          </div>
        </>
      )}

      {onglet === "plans" && !chargement && plans.length === 0 && (
        <Carte><p className="text-center text-gray-500">Aucun plan d'abonnement. Créez-en un.</p></Carte>
      )}

      {onglet === "plans" && !chargement && plans.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <Carte key={p.id} className="relative flex flex-col">
                {!p.actif && <span className="absolute right-3 top-3 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactif</span>}
                <h3 className="text-lg font-bold text-gray-900">{p.nom}</h3>
                <p className="mt-1 text-2xl font-extrabold text-primaire">{formaterMontant(p.prix, p.devise)}</p>
                <p className="text-sm text-gray-500">/ {p.dureeJours} jours</p>
                {p.description && <p className="mt-2 text-sm text-gray-600">{p.description}</p>}
                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  {p.maxServices && <p>Max {p.maxServices} services</p>}
                  {p.commissionReduite != null && <p>Commission {p.commissionReduite}%</p>}
                </div>
                {p.fonctionnalites && p.fonctionnalites !== "[]" && (
                  <div className="mt-2 space-y-1">
                    {JSON.parse(p.fonctionnalites).map((f: string, i: number) => (
                      <p key={i} className="text-xs text-emerald-600">✓ {f}</p>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex gap-2 pt-4">
                  <Bouton variante="fantome" taille="sm" onClick={() => ouvrirModal(p)}><Pencil className="h-3 w-3" /> Modifier</Bouton>
                  <Bouton variante="destructif" taille="sm" onClick={() => supprimer(p.id)}><Trash2 className="h-3 w-3" /> Supprimer</Bouton>
                </div>
              </Carte>
            ))}
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
            <h2 className="mb-4 text-lg font-bold text-gray-900">{edition ? "Modifier le plan" : "Nouveau plan"}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom *</label>
                <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Professionnel" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prix *</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" type="number" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Durée (jours) *</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" type="number" value={form.dureeJours} onChange={e => setForm({ ...form, dureeJours: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max services</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" type="number" value={form.maxServices} onChange={e => setForm({ ...form, maxServices: e.target.value })} placeholder="Illimité" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Commission réduite %</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" type="number" value={form.commissionReduite} onChange={e => setForm({ ...form, commissionReduite: e.target.value })} placeholder="Défaut 4%" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fonctionnalités (JSON)</label>
                <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.fonctionnalites} onChange={e => setForm({ ...form, fonctionnalites: e.target.value })} placeholder='["SMS confirmation", "Support prioritaire"]' />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Bouton variante="fantome" onClick={() => setModalOuvert(false)}>Annuler</Bouton>
              <Bouton onClick={sauvegarder}>{edition ? "Modifier" : "Créer"}</Bouton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
