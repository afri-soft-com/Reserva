"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X, Pencil, Trash2, Search, Printer } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { useAuthStore } from "../../../lib/store-auth";
import {
  listerCodesPromos,
  creerCodePromo,
  modifierCodePromo,
  supprimerCodePromo,
} from "../../../lib/api-codes-promos";
import { imprimerElement, tableVersHtml } from "../../../lib/impression";

type Formulaire = {
  code: string;
  description: string;
  type: "PERCENTAGE" | "FIXED";
  valeur: string;
  devise: string;
  montantMin: string;
  usageMax: string;
  dateDebut: string;
  dateFin: string;
};

const FORMULAIRE_VIDE: Formulaire = {
  code: "",
  description: "",
  type: "PERCENTAGE",
  valeur: "",
  devise: "CDF",
  montantMin: "",
  usageMax: "",
  dateDebut: new Date().toISOString().slice(0, 16),
  dateFin: "",
};

const TYPES = ["PERCENTAGE", "FIXED"];
const DEVISES = ["CDF", "USD"];

function genererCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function PageAdminCodesPromos() {
  const { utilisateur } = useAuthStore();
  const [codes, setCodes] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [formulaire, setFormulaire] = useState<Formulaire>(FORMULAIRE_VIDE);
  const [soumission, setSoumission] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [filtreActif, setFiltreActif] = useState<"" | "oui" | "non">("");

  useEffect(() => {
    charger();
  }, []);

  const codesFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return codes.filter((c) => {
      if (filtreActif === "oui" && !c.actif) return false;
      if (filtreActif === "non" && c.actif) return false;
      if (!q) return true;
      return (
        c.code?.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    });
  }, [codes, recherche, filtreActif]);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await listerCodesPromos();
      setCodes(resultat);
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }

  function ouvrirCreation() {
    setFormulaire({ ...FORMULAIRE_VIDE, code: genererCode() });
    setEditionId(null);
    setAfficherFormulaire(true);
  }

  function ouvrirEdition(code: any) {
    setFormulaire({
      code: code.code,
      description: code.description || "",
      type: code.type,
      valeur: code.valeur.toString(),
      devise: code.devise,
      montantMin: code.montantMin?.toString() || "",
      usageMax: code.usageMax?.toString() || "",
      dateDebut: code.dateDebut ? new Date(code.dateDebut).toISOString().slice(0, 16) : "",
      dateFin: code.dateFin ? new Date(code.dateFin).toISOString().slice(0, 16) : "",
    });
    setEditionId(code.id);
    setAfficherFormulaire(true);
  }

  async function handleSoumettre() {
    setSoumission(true);
    try {
      const payload = {
        code: formulaire.code.trim(),
        description: formulaire.description || undefined,
        type: formulaire.type,
        valeur: parseFloat(formulaire.valeur),
        devise: formulaire.devise,
        montantMin: formulaire.montantMin ? parseFloat(formulaire.montantMin) : undefined,
        usageMax: formulaire.usageMax ? parseInt(formulaire.usageMax) : undefined,
        dateDebut: new Date(formulaire.dateDebut).toISOString(),
        dateFin: formulaire.dateFin ? new Date(formulaire.dateFin).toISOString() : "",
      };
      if (editionId) {
        await modifierCodePromo(editionId, payload);
        toastSucces("Code promo modifié avec succès.");
      } else {
        await creerCodePromo(payload);
        toastSucces("Code promo créé avec succès.");
      }
      setAfficherFormulaire(false);
      charger();
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    } finally {
      setSoumission(false);
    }
  }

  async function handleSupprimer(id: string) {
    if (!confirm("Désactiver ce code promo ?")) return;
    try {
      await supprimerCodePromo(id);
      toastSucces("Code promo désactivé.");
      charger();
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    }
  }

  function imprimer() {
    imprimerElement(
      "Codes promo",
      tableVersHtml(
        ["Code", "Type", "Valeur", "Actif", "Usages", "Début", "Fin"],
        codesFiltres.map((c) => [
          c.code || "—",
          c.type || "—",
          String(c.valeur ?? "—"),
          c.actif ? "Oui" : "Non",
          `${c.usageActuel ?? 0}${c.usageMax != null ? ` / ${c.usageMax}` : ""}`,
          c.dateDebut ? new Date(c.dateDebut).toLocaleDateString("fr-FR") : "—",
          c.dateFin ? new Date(c.dateFin).toLocaleDateString("fr-FR") : "—",
        ])
      )
    );
  }

  if (utilisateur?.role !== "ADMIN") {
    return <Carte><p className="text-center text-gray-500">Accès non autorisé.</p></Carte>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Codes Promo</h1>
        <div className="flex flex-wrap gap-2">
          <Bouton variante="fantome" taille="sm" onClick={imprimer} disabled={codesFiltres.length === 0}>
            <Printer className="h-4 w-4" /> Imprimer
          </Bouton>
          <Bouton variante="primaire" taille="sm" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" /> Nouveau code
          </Bouton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Code ou description…"
            className="h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={filtreActif}
          onChange={(e) => setFiltreActif(e.target.value as "" | "oui" | "non")}
        >
          <option value="">Tous</option>
          <option value="oui">Actifs</option>
          <option value="non">Inactifs</option>
        </select>
      </div>

      {chargement && <p className="text-gray-500">Chargement...</p>}

      {!chargement && codesFiltres.length === 0 && (
        <Carte className="text-center text-gray-500">Aucun code promo créé.</Carte>
      )}

      {!chargement && codesFiltres.length > 0 && (
        <div className="overflow-x-auto rounded-card shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <table className="w-full bg-white text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Valeur</th>
                <th className="px-4 py-3">Min.</th>
                <th className="px-4 py-3">Utilisé</th>
                <th className="px-4 py-3">Max</th>
                <th className="px-4 py-3">Début</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3">Actif</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codesFiltres.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{c.code}</td>
                  <td className="px-4 py-3 text-gray-600">{c.type === "PERCENTAGE" ? "%" : "Fixe"}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {c.type === "PERCENTAGE" ? `${c.valeur}%` : `${c.valeur} ${c.devise}`}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.montantMin ? `${c.montantMin} ${c.devise}` : "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.usageCount}</td>
                  <td className="px-4 py-3 text-gray-600">{c.usageMax ?? "∞"}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(c.dateDebut).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(c.dateFin).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.actif ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                      {c.actif ? "Oui" : "Non"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Bouton variante="fantome" taille="sm" onClick={() => ouvrirEdition(c)}>
                        <Pencil className="h-4 w-4" />
                      </Bouton>
                      <Bouton variante="fantome" taille="sm" onClick={() => handleSupprimer(c.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Bouton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {afficherFormulaire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setAfficherFormulaire(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editionId ? "Modifier le code promo" : "Nouveau code promo"}
              </h2>
              <button onClick={() => setAfficherFormulaire(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Code *</label>
                <input type="text" value={formulaire.code} onChange={(e) => setFormulaire({ ...formulaire, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm font-mono uppercase outline-none focus:border-primaire"
                  maxLength={30} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea value={formulaire.description} onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select value={formulaire.type} onChange={(e) => setFormulaire({ ...formulaire, type: e.target.value as "PERCENTAGE" | "FIXED" })}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire">
                    {TYPES.map((t) => <option key={t} value={t}>{t === "PERCENTAGE" ? "Pourcentage (%)" : "Montant fixe"}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Valeur *</label>
                  <input type="number" value={formulaire.valeur} onChange={(e) => setFormulaire({ ...formulaire, valeur: e.target.value })}
                    placeholder={formulaire.type === "PERCENTAGE" ? "10" : "5000"}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" min={1} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Devise</label>
                  <select value={formulaire.devise} onChange={(e) => setFormulaire({ ...formulaire, devise: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire">
                    {DEVISES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Montant minimum (optionnel)</label>
                  <input type="number" value={formulaire.montantMin} onChange={(e) => setFormulaire({ ...formulaire, montantMin: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" min={0} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Utilisations max (optionnel)</label>
                <input type="number" value={formulaire.usageMax} onChange={(e) => setFormulaire({ ...formulaire, usageMax: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" min={1} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Date début *</label>
                  <input type="datetime-local" value={formulaire.dateDebut} onChange={(e) => setFormulaire({ ...formulaire, dateDebut: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date fin *</label>
                  <input type="datetime-local" value={formulaire.dateFin} onChange={(e) => setFormulaire({ ...formulaire, dateFin: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Bouton variante="primaire" taille="sm" chargement={soumission} disabled={!formulaire.code.trim() || !formulaire.valeur} onClick={handleSoumettre} className="flex-1">
                  {editionId ? "Enregistrer" : "Créer"}
                </Bouton>
                <Bouton variante="fantome" taille="sm" onClick={() => setAfficherFormulaire(false)} className="flex-1">
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
