"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, X, Pencil, Trash2, ExternalLink, Image, Camera, Upload } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { useAuthStore } from "../../../lib/store-auth";
import {
  listerPublicitesAdmin,
  creerPublicite,
  modifierPublicite,
  supprimerPublicite,
  uploaderImage,
} from "../../../lib/api-publicites";

type Formulaire = {
  titre: string;
  imageUrl: string;
  lienUrl: string;
  description: string;
  actif: boolean;
  dateDebut: string;
  dateFin: string;
  cible: string;
};

const FORMULAIRE_VIDE: Formulaire = {
  titre: "",
  imageUrl: "",
  lienUrl: "",
  description: "",
  actif: true,
  dateDebut: new Date().toISOString().slice(0, 16),
  dateFin: "",
  cible: "TOUS",
};

const CIBLES = ["TOUS", "CLIENT", "PRESTATAIRE", "ADMIN"];
const API_BASE = "http://localhost:4000";

function urlImage(val: string): string {
  if (!val) return "";
  if (val.startsWith("http://") || val.startsWith("https://")) return val;
  return `${API_BASE}${val}`;
}

export default function PageAdminPublicites() {
  const { utilisateur } = useAuthStore();
  const [publicites, setPublicites] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [formulaire, setFormulaire] = useState<Formulaire>(FORMULAIRE_VIDE);
  const [soumission, setSoumission] = useState(false);
  const [uploadFichier, setUploadFichier] = useState<File | null>(null);
  const [uploadChargement, setUploadChargement] = useState(false);
  const refInputFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await listerPublicitesAdmin();
      setPublicites(resultat);
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }

  function ouvrirCreation() {
    setFormulaire(FORMULAIRE_VIDE);
    setEditionId(null);
    setUploadFichier(null);
    setAfficherFormulaire(true);
  }

  function ouvrirEdition(pub: any) {
    setFormulaire({
      titre: pub.titre,
      imageUrl: pub.imageUrl || "",
      lienUrl: pub.lienUrl || "",
      description: pub.description || "",
      actif: pub.actif,
      dateDebut: pub.dateDebut ? new Date(pub.dateDebut).toISOString().slice(0, 16) : "",
      dateFin: pub.dateFin ? new Date(pub.dateFin).toISOString().slice(0, 16) : "",
      cible: pub.cible || "TOUS",
    });
    setEditionId(pub.id);
    setUploadFichier(null);
    setAfficherFormulaire(true);
  }

  async function handleSoumettre() {
    setSoumission(true);
    try {
      const payload = {
        ...formulaire,
        imageUrl: formulaire.imageUrl || undefined,
        lienUrl: formulaire.lienUrl || undefined,
        description: formulaire.description || undefined,
        dateFin: formulaire.dateFin || undefined,
      };
      if (editionId) {
        await modifierPublicite(editionId, payload);
        toastSucces("Publicité modifiée avec succès.");
      } else {
        await creerPublicite(payload);
        toastSucces("Publicité créée avec succès.");
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
    if (!confirm("Supprimer cette publicité ?")) return;
    try {
      await supprimerPublicite(id);
      toastSucces("Publicité supprimée.");
      charger();
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    }
  }

  if (utilisateur?.role !== "ADMIN") {
    return <Carte><p className="text-center text-gray-500">Accès non autorisé.</p></Carte>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Publicités</h1>
        <Bouton variante="primaire" taille="sm" onClick={ouvrirCreation}>
          <Plus className="h-4 w-4" /> Nouvelle publicité
        </Bouton>
      </div>

      {chargement && <p className="text-gray-500">Chargement...</p>}

      {!chargement && publicites.length === 0 && (
        <Carte className="text-center text-gray-500">Aucune publicité créée.</Carte>
      )}

      {!chargement && publicites.length > 0 && (
        <div className="overflow-x-auto rounded-card shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <table className="w-full bg-white text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Cible</th>
                <th className="px-4 py-3">Début</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3">Actif</th>
                <th className="px-4 py-3">Impr.</th>
                <th className="px-4 py-3">Clics</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {publicites.map((pub) => (
                <tr key={pub.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{pub.titre}</td>
                  <td className="px-4 py-3 text-gray-600">{pub.cible}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(pub.dateDebut).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{pub.dateFin ? new Date(pub.dateFin).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${pub.actif ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                      {pub.actif ? "Oui" : "Non"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{pub.impressions}</td>
                  <td className="px-4 py-3 text-gray-600">{pub.clics}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Bouton variante="fantome" taille="sm" onClick={() => ouvrirEdition(pub)}>
                        <Pencil className="h-4 w-4" />
                      </Bouton>
                      <Bouton variante="fantome" taille="sm" onClick={() => handleSupprimer(pub.id)}>
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
                {editionId ? "Modifier la publicité" : "Nouvelle publicité"}
              </h2>
              <button onClick={() => setAfficherFormulaire(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Titre *</label>
                <input type="text" value={formulaire.titre} onChange={(e) => setFormulaire({ ...formulaire, titre: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Image</label>
                <div className="flex gap-2">
                  <input type="url" value={formulaire.imageUrl} onChange={(e) => setFormulaire({ ...formulaire, imageUrl: e.target.value })}
                    placeholder="https://exemple.com/image.jpg"
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" />
                  <input type="file" ref={refInputFichier} accept="image/*" capture="environment" className="hidden"
                    onChange={async (e) => {
                      const fichier = e.target.files?.[0];
                      if (!fichier) return;
                      setUploadFichier(fichier);
                      setUploadChargement(true);
                      try {
                        const url = await uploaderImage(fichier);
                        setFormulaire({ ...formulaire, imageUrl: url });
                        toastSucces("Image uploadée avec succès.");
                      } catch (err) {
                        toastErreur(extraireMessageErreur(err));
                      } finally {
                        setUploadChargement(false);
                      }
                    }} />
                  <Bouton variante="secondaire" taille="sm" type="button" chargement={uploadChargement}
                    onClick={() => refInputFichier.current?.click()}>
                    <Camera className="h-4 w-4" />
                  </Bouton>
                </div>
              </div>
              {formulaire.imageUrl && (
                <div className="flex items-center gap-2">
                  <img src={urlImage(formulaire.imageUrl)} alt="Aperçu" className="h-16 w-16 rounded-lg object-cover" />
                  <span className="truncate text-sm text-gray-500">{formulaire.imageUrl}</span>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Lien (URL de redirection)</label>
                <div className="flex items-center gap-2">
                  <input type="url" value={formulaire.lienUrl} onChange={(e) => setFormulaire({ ...formulaire, lienUrl: e.target.value })}
                    placeholder="https://exemple.com/promotion"
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" />
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea value={formulaire.description} onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Cible</label>
                  <select value={formulaire.cible} onChange={(e) => setFormulaire({ ...formulaire, cible: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire">
                    {CIBLES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Actif</label>
                  <select value={formulaire.actif ? "true" : "false"} onChange={(e) => setFormulaire({ ...formulaire, actif: e.target.value === "true" })}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire">
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Date début</label>
                  <input type="datetime-local" value={formulaire.dateDebut} onChange={(e) => setFormulaire({ ...formulaire, dateDebut: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date fin (optionnelle)</label>
                  <input type="datetime-local" value={formulaire.dateFin} onChange={(e) => setFormulaire({ ...formulaire, dateFin: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Bouton variante="primaire" taille="sm" chargement={soumission} disabled={!formulaire.titre.trim()} onClick={handleSoumettre} className="flex-1">
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
