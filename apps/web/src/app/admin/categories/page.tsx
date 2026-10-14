"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X, Pencil, Trash2, FolderTree, Search, Printer } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { useAuthStore } from "../../../lib/store-auth";
import {
  listerCategoriesAdmin,
  creerCategorie,
  modifierCategorie,
  supprimerCategorie,
  type CategorieServiceDto,
} from "../../../lib/api-categories";
import { imprimerElement, tableVersHtml } from "../../../lib/impression";

type Formulaire = {
  code: string;
  libelle: string;
  description: string;
  icone: string;
  couleur: string;
  ordre: string;
  actif: boolean;
};

const FORMULAIRE_VIDE: Formulaire = {
  code: "",
  libelle: "",
  description: "",
  icone: "",
  couleur: "",
  ordre: "",
  actif: true,
};

export default function PageAdminCategories() {
  const { utilisateur } = useAuthStore();
  const [categories, setCategories] = useState<CategorieServiceDto[]>([]);
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

  const categoriesFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return categories.filter((c) => {
      if (filtreActif === "oui" && !c.actif) return false;
      if (filtreActif === "non" && c.actif) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.libelle.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    });
  }, [categories, recherche, filtreActif]);

  async function charger() {
    setChargement(true);
    try {
      setCategories(await listerCategoriesAdmin());
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }

  function ouvrirCreation() {
    setFormulaire({ ...FORMULAIRE_VIDE });
    setEditionId(null);
    setAfficherFormulaire(true);
  }

  function ouvrirEdition(cat: CategorieServiceDto) {
    setFormulaire({
      code: cat.code,
      libelle: cat.libelle,
      description: cat.description || "",
      icone: cat.icone || "",
      couleur: cat.couleur || "",
      ordre: String(cat.ordre),
      actif: cat.actif,
    });
    setEditionId(cat.id);
    setAfficherFormulaire(true);
  }

  async function handleSoumettre() {
    setSoumission(true);
    try {
      const payload = {
        libelle: formulaire.libelle.trim(),
        description: formulaire.description.trim() || null,
        icone: formulaire.icone.trim() || null,
        couleur: formulaire.couleur.trim() || null,
        ordre: formulaire.ordre ? parseInt(formulaire.ordre, 10) : undefined,
        actif: formulaire.actif,
      };
      if (editionId) {
        await modifierCategorie(editionId, payload);
        toastSucces("Catégorie modifiée.");
      } else {
        await creerCategorie({
          ...payload,
          code: formulaire.code.trim().toUpperCase(),
        });
        toastSucces("Catégorie créée.");
      }
      setAfficherFormulaire(false);
      await charger();
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    } finally {
      setSoumission(false);
    }
  }

  async function handleSupprimer(cat: CategorieServiceDto) {
    if (!confirm(`Supprimer ou désactiver « ${cat.libelle} » (${cat.code}) ?`)) return;
    try {
      const res = await supprimerCategorie(cat.id);
      toastSucces(res.message);
      await charger();
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    }
  }

  function imprimer() {
    imprimerElement(
      "Catégories de services",
      tableVersHtml(
        ["Ordre", "Code", "Libellé", "Description", "Actif"],
        categoriesFiltrees.map((c) => [
          String(c.ordre),
          c.code,
          c.libelle,
          c.description || "—",
          c.actif ? "Oui" : "Non",
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <FolderTree className="h-6 w-6 text-primaire" />
            Catégories de services
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Codes utilisés par les prestataires, la recherche et le KYC.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Bouton variante="fantome" taille="sm" onClick={imprimer} disabled={categoriesFiltrees.length === 0}>
            <Printer className="h-4 w-4" /> Imprimer
          </Bouton>
          <Bouton variante="primaire" taille="sm" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" /> Nouvelle catégorie
          </Bouton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Code, libellé, description…"
            className="h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={filtreActif}
          onChange={(e) => setFiltreActif(e.target.value as "" | "oui" | "non")}
        >
          <option value="">Toutes</option>
          <option value="oui">Actives</option>
          <option value="non">Inactives</option>
        </select>
      </div>

      {chargement && <p className="text-gray-500">Chargement...</p>}

      {!chargement && categoriesFiltrees.length === 0 && (
        <Carte className="text-center text-gray-500">Aucune catégorie.</Carte>
      )}

      {!chargement && categoriesFiltrees.length > 0 && (
        <div className="overflow-x-auto rounded-card shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <table className="w-full bg-white text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Ordre</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Libellé</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Couleur</th>
                <th className="px-4 py-3">Actif</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categoriesFiltrees.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{c.ordre}</td>
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{c.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.libelle}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-600">
                    {c.description || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.couleur ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: c.couleur }}
                        />
                        <span className="font-mono text-xs text-gray-500">{c.couleur}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        c.actif ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {c.actif ? "Oui" : "Non"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Bouton variante="fantome" taille="sm" onClick={() => ouvrirEdition(c)}>
                        <Pencil className="h-4 w-4" />
                      </Bouton>
                      <Bouton variante="fantome" taille="sm" onClick={() => handleSupprimer(c)}>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setAfficherFormulaire(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editionId ? "Modifier la catégorie" : "Nouvelle catégorie"}
              </h2>
              <button type="button" onClick={() => setAfficherFormulaire(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Code *</label>
                <input
                  type="text"
                  value={formulaire.code}
                  disabled={!!editionId}
                  onChange={(e) =>
                    setFormulaire({ ...formulaire, code: e.target.value.toUpperCase() })
                  }
                  placeholder="EX: BEAUTE"
                  className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm uppercase outline-none focus:border-primaire disabled:bg-gray-50"
                  maxLength={40}
                />
                {editionId && (
                  <p className="mt-1 text-xs text-gray-400">Le code ne peut pas être modifié.</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Libellé *</label>
                <input
                  type="text"
                  value={formulaire.libelle}
                  onChange={(e) => setFormulaire({ ...formulaire, libelle: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formulaire.description}
                  onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Icône (optionnel)</label>
                  <input
                    type="text"
                    value={formulaire.icone}
                    onChange={(e) => setFormulaire({ ...formulaire, icone: e.target.value })}
                    placeholder="health / bus…"
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Couleur (#hex)</label>
                  <input
                    type="text"
                    value={formulaire.couleur}
                    onChange={(e) => setFormulaire({ ...formulaire, couleur: e.target.value })}
                    placeholder="#0EA5E9"
                    className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm outline-none focus:border-primaire"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Ordre d&apos;affichage</label>
                  <input
                    type="number"
                    value={formulaire.ordre}
                    onChange={(e) => setFormulaire({ ...formulaire, ordre: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire"
                    min={0}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={formulaire.actif}
                      onChange={(e) => setFormulaire({ ...formulaire, actif: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Catégorie active
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Bouton
                  variante="primaire"
                  taille="sm"
                  chargement={soumission}
                  disabled={
                    !formulaire.libelle.trim() || (!editionId && !formulaire.code.trim())
                  }
                  onClick={handleSoumettre}
                  className="flex-1"
                >
                  {editionId ? "Enregistrer" : "Créer"}
                </Bouton>
                <Bouton
                  variante="fantome"
                  taille="sm"
                  onClick={() => setAfficherFormulaire(false)}
                  className="flex-1"
                >
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
