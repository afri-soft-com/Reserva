"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ShieldOff,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Printer,
  Search,
  X,
} from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import {
  bloquerUtilisateurAdmin,
  creerUtilisateurAdmin,
  debloquerUtilisateurAdmin,
  listerTousUtilisateursAdmin,
  modifierUtilisateurAdmin,
  supprimerUtilisateurAdmin,
  telechargerExportAdmin,
} from "../../../lib/api-admin";
import { imprimerElement, tableVersHtml } from "../../../lib/impression";
import { useAuthStore } from "../../../lib/store-auth";

const ROLE_LABEL: Record<string, string> = {
  CLIENT: "Client",
  PRESTATAIRE: "Prestataire",
  ADMIN: "Admin",
  AGENT: "Agent",
};

type Formulaire = {
  telephone: string;
  nom: string;
  email: string;
  role: "CLIENT" | "ADMIN" | "AGENT";
  pin: string;
  langue: string;
};

const FORM_VIDE: Formulaire = {
  telephone: "+243",
  nom: "",
  email: "",
  role: "CLIENT",
  pin: "",
  langue: "fr",
};

function estBloque(u: { bloqueJusquA?: string | null }) {
  return !!u.bloqueJusquA && new Date(u.bloqueJusquA).getTime() > Date.now();
}

export default function PageAdminUtilisateurs() {
  const { utilisateur } = useAuthStore();
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [bloque, setBloque] = useState<"" | "oui" | "non">("");
  const [modal, setModal] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [form, setForm] = useState<Formulaire>(FORM_VIDE);
  const [soumission, setSoumission] = useState(false);

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, role, bloque]);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await listerTousUtilisateursAdmin(page, 20, {
        recherche: q || undefined,
        role: role || undefined,
        bloque: bloque || undefined,
      });
      setUtilisateurs(resultat.items);
      setTotalPages(resultat.totalPages);
      setTotal(resultat.total);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  function ouvrirCreation() {
    setEditionId(null);
    setForm({ ...FORM_VIDE });
    setModal(true);
  }

  function ouvrirEdition(u: any) {
    setEditionId(u.id);
    setForm({
      telephone: u.telephone,
      nom: u.nom || "",
      email: u.email || "",
      role: u.role === "ADMIN" || u.role === "AGENT" ? u.role : "CLIENT",
      pin: "",
      langue: u.langue || "fr",
    });
    setModal(true);
  }

  async function soumettre() {
    setSoumission(true);
    try {
      if (editionId) {
        await modifierUtilisateurAdmin(editionId, {
          nom: form.nom.trim(),
          email: form.email.trim() || null,
          role: form.role,
          langue: form.langue,
          ...(form.pin ? { pin: form.pin } : {}),
        });
        toastSucces("Utilisateur modifié.");
      } else {
        await creerUtilisateurAdmin({
          telephone: form.telephone.trim(),
          nom: form.nom.trim(),
          email: form.email.trim() || undefined,
          role: form.role,
          pin: form.pin,
          langue: form.langue,
        });
        toastSucces("Utilisateur créé.");
      }
      setModal(false);
      await charger();
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setSoumission(false);
    }
  }

  async function toggleBlocage(u: any) {
    if (u.role === "ADMIN") {
      toastErreur("Impossible de bloquer un administrateur.");
      return;
    }
    setActionId(u.id);
    try {
      if (estBloque(u)) {
        await debloquerUtilisateurAdmin(u.id);
        toastSucces(`${u.nom} débloqué.`);
      } else {
        if (!confirm(`Bloquer ${u.nom} (${u.telephone}) ?`)) return;
        await bloquerUtilisateurAdmin(u.id);
        toastSucces(`${u.nom} bloqué.`);
      }
      await charger();
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setActionId(null);
    }
  }

  async function supprimer(u: any) {
    if (!confirm(`Supprimer définitivement (anonymiser) ${u.nom} ?`)) return;
    setActionId(u.id);
    try {
      await supprimerUtilisateurAdmin(u.id);
      toastSucces("Utilisateur anonymisé / bloqué.");
      await charger();
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setActionId(null);
    }
  }

  function imprimer() {
    imprimerElement(
      "Utilisateurs",
      tableVersHtml(
        ["Nom", "Téléphone", "Email", "Rôle", "Statut", "Inscrit le"],
        utilisateurs.map((u) => [
          u.nom,
          u.telephone,
          u.email || "—",
          ROLE_LABEL[u.role] || u.role,
          estBloque(u) ? "Bloqué" : "Actif",
          u.creeLe ? new Date(u.creeLe).toLocaleDateString("fr-FR") : "—",
        ])
      )
    );
  }

  if (utilisateur?.role !== "ADMIN") {
    return (
      <Carte>
        <p className="text-center text-gray-500">Accès non autorisé.</p>
      </Carte>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} compte(s) — recherche, filtres, CRUD, impression et export CSV.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Bouton variante="fantome" taille="sm" onClick={imprimer}>
            <Printer className="h-4 w-4" /> Imprimer
          </Bouton>
          <Bouton
            variante="fantome"
            taille="sm"
            onClick={() => telechargerExportAdmin("utilisateurs").catch((e) => toastErreur(extraireMessageErreur(e)))}
          >
            Export CSV
          </Bouton>
          <Bouton variante="primaire" taille="sm" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" /> Nouvel utilisateur
          </Bouton>
        </div>
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
            placeholder="Nom, téléphone, email…"
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
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value);
          }}
        >
          <option value="">Tous rôles</option>
          <option value="CLIENT">Client</option>
          <option value="PRESTATAIRE">Prestataire</option>
          <option value="AGENT">Agent</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={bloque}
          onChange={(e) => {
            setPage(1);
            setBloque(e.target.value as "" | "oui" | "non");
          }}
        >
          <option value="">Tous statuts</option>
          <option value="non">Actifs</option>
          <option value="oui">Bloqués</option>
        </select>
      </div>

      {chargement && <p className="text-gray-500">Chargement...</p>}

      {!chargement && utilisateurs.length === 0 && (
        <Carte className="text-center text-gray-500">Aucun utilisateur trouvé.</Carte>
      )}

      {!chargement && utilisateurs.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <table className="w-full bg-white text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Inscrit le</th>
                  <th className="px-4 py-3">2FA</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {utilisateurs.map((u) => {
                  const bloqueActif = estBloque(u);
                  return (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.nom}</td>
                      <td className="px-4 py-3 text-gray-600">{u.telephone}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-primaire-50 px-2.5 py-0.5 text-xs font-semibold text-primaire-700">
                          {ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {u.creeLe ? new Date(u.creeLe).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.deuxFAActif ? "Oui" : "Non"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            bloqueActif ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {bloqueActif ? "Bloqué" : "Actif"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Bouton variante="fantome" taille="sm" onClick={() => ouvrirEdition(u)}>
                            <Pencil className="h-4 w-4" />
                          </Bouton>
                          {u.role !== "ADMIN" && (
                            <Bouton
                              variante="fantome"
                              taille="sm"
                              chargement={actionId === u.id}
                              onClick={() => toggleBlocage(u)}
                            >
                              {bloqueActif ? (
                                <Shield className="h-4 w-4" />
                              ) : (
                                <ShieldOff className="h-4 w-4 text-red-500" />
                              )}
                            </Bouton>
                          )}
                          <Bouton
                            variante="fantome"
                            taille="sm"
                            chargement={actionId === u.id}
                            onClick={() => supprimer(u)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Bouton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Bouton variante="fantome" taille="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Bouton>
            <span className="text-sm text-gray-600">
              Page {page} / {Math.max(totalPages, 1)}
            </span>
            <Bouton
              variante="fantome"
              taille="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Bouton>
          </div>
        </>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editionId ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
              </h2>
              <button type="button" onClick={() => setModal(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              {!editionId && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Téléphone *</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  />
                </div>
              )}
              {editionId && (
                <p className="text-sm text-gray-500">
                  Téléphone : <span className="font-mono">{form.telephone}</span> (non modifiable)
                </p>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Nom *</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Rôle</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value as Formulaire["role"] })
                    }
                  >
                    <option value="CLIENT">Client</option>
                    <option value="AGENT">Agent</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Langue</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                    value={form.langue}
                    onChange={(e) => setForm({ ...form, langue: e.target.value })}
                  >
                    <option value="fr">Français</option>
                    <option value="ln">Lingala</option>
                    <option value="sw">Swahili</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  PIN {editionId ? "(laisser vide pour ne pas changer)" : "*"}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  placeholder="••••"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Bouton
                  variante="primaire"
                  taille="sm"
                  className="flex-1"
                  chargement={soumission}
                  disabled={!form.nom.trim() || (!editionId && (!form.telephone.trim() || form.pin.length !== 4))}
                  onClick={soumettre}
                >
                  {editionId ? "Enregistrer" : "Créer"}
                </Bouton>
                <Bouton variante="fantome" taille="sm" className="flex-1" onClick={() => setModal(false)}>
                  Annuler
                </Bouton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
