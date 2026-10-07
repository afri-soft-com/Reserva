"use client";

import { useEffect, useState } from "react";
import { FileCheck2 } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import {
  enregistrerExigenceDocumentsAdmin,
  obtenirExigenceDocumentsAdmin,
} from "../../../lib/api-admin";
import { useAuthStore } from "../../../lib/store-auth";
import { LIBELLES_CATEGORIE } from "@reserva/shared";

const CATEGORIES = Object.keys(LIBELLES_CATEGORIE) as (keyof typeof LIBELLES_CATEGORIE)[];

export default function PageDocumentsKyc() {
  const { utilisateur } = useAuthStore();
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [actif, setActif] = useState(false);
  const [delaiJours, setDelaiJours] = useState(7);
  const [activeLe, setActiveLe] = useState<string | null>(null);
  const [documentsDispo, setDocumentsDispo] = useState<{ id: string; libelle: string }[]>([]);
  const [parCategorie, setParCategorie] = useState<Record<string, string[]>>({});
  const [categorieActive, setCategorieActive] = useState<string>("SANTE");

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    try {
      const data = await obtenirExigenceDocumentsAdmin();
      setActif(data.config.actif);
      setDelaiJours(data.config.delaiJours);
      setActiveLe(data.config.activeLe);
      setDocumentsDispo(data.documentsDisponibles);
      setParCategorie(data.config.documents || {});
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setChargement(false);
    }
  }

  function toggleDoc(docId: string) {
    setParCategorie((prev) => {
      const liste = new Set(prev[categorieActive] || []);
      if (liste.has(docId)) liste.delete(docId);
      else liste.add(docId);
      return { ...prev, [categorieActive]: Array.from(liste) };
    });
  }

  async function sauvegarder() {
    setEnvoi(true);
    try {
      const data = await enregistrerExigenceDocumentsAdmin({
        actif,
        delaiJours,
        documents: parCategorie,
      });
      setActiveLe(data.config.activeLe);
      toastSucces(
        actif
          ? `Exigence activée — compte à rebours de ${delaiJours} jour(s) redémarré.`
          : "Exigence documentaire désactivée."
      );
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  if (utilisateur?.role !== "ADMIN") {
    return <Carte><p className="text-center text-gray-500">Accès non autorisé.</p></Carte>;
  }

  if (chargement) return <p className="text-gray-500">Chargement…</p>;

  const selection = new Set(parCategorie[categorieActive] || []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <FileCheck2 className="h-7 w-7 text-primaire" />
          Documents prestataires &amp; notifications
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Cochez les documents obligatoires par catégorie. Tant qu&apos;ils ne sont pas téléchargés et validés,
          les prestataires reçoivent des rappels dans l&apos;app. Après le délai (à partir de la sauvegarde de
          la règle, pas de la création du compte), ils ne sont plus visibles ni réservables. Modifier et
          réenregistrer redémarre le compte à rebours.
        </p>
      </div>

      <Carte className="space-y-4">
        <label className="flex items-start gap-3 text-sm text-gray-800">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
          />
          <span>
            <span className="font-semibold">Activer l&apos;exigence documentaire</span>
            <span className="block text-gray-500">
              (notifications + retrait de la marketplace après le délai)
            </span>
          </span>
        </label>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Délai avant blocage (jours, 0 = immédiat)
          </label>
          <input
            type="number"
            min={0}
            max={365}
            value={delaiJours}
            onChange={(e) => setDelaiJours(Number(e.target.value))}
            className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primaire"
          />
          {activeLe && (
            <p className="mt-1 text-xs text-gray-500">
              Dernière activation : {new Date(activeLe).toLocaleString("fr-FR")}
            </p>
          )}
        </div>
      </Carte>

      <Carte>
        <h2 className="mb-3 font-semibold text-gray-900">Documents par catégorie</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategorieActive(c)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                categorieActive === c
                  ? "bg-primaire text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {LIBELLES_CATEGORIE[c]}
              <span className="ml-1 opacity-70">({(parCategorie[c] || []).length})</span>
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {documentsDispo.map((doc) => (
            <label
              key={doc.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selection.has(doc.id)}
                onChange={() => toggleDoc(doc.id)}
              />
              {doc.libelle}
            </label>
          ))}
        </div>
      </Carte>

      <Bouton variante="primaire" chargement={envoi} onClick={sauvegarder}>
        Enregistrer la règle
      </Bouton>
    </div>
  );
}
