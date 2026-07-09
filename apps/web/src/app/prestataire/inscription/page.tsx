"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { Champ } from "../../../components/Champ";
import { toastSucces, toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { creerProfilPrestataire } from "../../../lib/api-prestataires";
import { useAuthStore } from "../../../lib/store-auth";
import { CATEGORIE_SERVICE, LIBELLES_CATEGORIE, CategorieService, VILLES_RDC } from "@reserva/shared";

export default function PageInscriptionPrestataire() {
  const router = useRouter();
  const { estConnecte, rafraichirProfil } = useAuthStore();

  const [nomEntreprise, setNomEntreprise] = useState("");
  const [categorie, setCategorie] = useState<CategorieService>("SANTE");
  const [ville, setVille] = useState("");
  const [quartier, setQuartier] = useState("");
  const [adresse, setAdresse] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [chargement, setChargement] = useState(false);

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    if (!estConnecte) {
      toastErreur("Connectez-vous d'abord pour créer un profil prestataire.");
      router.push("/connexion");
      return;
    }

    setChargement(true);
    try {
      const lat = parseFloat(latitude.replace(",", "."));
      const lng = parseFloat(longitude.replace(",", "."));
      await creerProfilPrestataire({
        nomEntreprise, categorie, ville, quartier,
        adresse: adresse || undefined,
        description: description || undefined,
        latitude: !isNaN(lat) ? lat : undefined,
        longitude: !isNaN(lng) ? lng : undefined,
      });
      await rafraichirProfil();
      toastSucces("Votre profil a été soumis ! Il sera examiné par notre équipe avant activation.");
      router.push("/prestataire/tableau-de-bord");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Carte>
        <h1 className="mb-1 text-2xl font-bold text-primaire-700">Devenir prestataire</h1>
        <p className="mb-6 text-sm text-gray-500">
          Renseignez les informations de votre établissement. Votre demande sera examinée par l&apos;équipe RESERVA avant activation (US-011).
        </p>

        <form onSubmit={gererSoumission} className="space-y-4">
          <Champ libelle="Nom de l'établissement" value={nomEntreprise} onChange={(e) => setNomEntreprise(e.target.value)} required />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Catégorie</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as CategorieService)}
              className="h-[52px] w-full rounded-champ border border-gray-300 bg-gray-50 px-4 text-base focus:border-primaire focus:outline-none"
            >
              {Object.values(CATEGORIE_SERVICE).map((cat) => (
                <option key={cat} value={cat}>
                  {LIBELLES_CATEGORIE[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Ville</label>
            <select
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="h-[52px] w-full rounded-champ border border-gray-300 bg-gray-50 px-4 text-base focus:border-primaire focus:outline-none"
              required
            >
              <option value="">Sélectionnez une ville</option>
              {VILLES_RDC.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <Champ libelle="Quartier" value={quartier} onChange={(e) => setQuartier(e.target.value)} required />
          <Champ libelle="Adresse (optionnel)" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Champ libelle="Latitude (optionnel)" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-4.3050" />
            <Champ libelle="Longitude (optionnel)" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="15.3050" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-champ border border-gray-300 bg-gray-50 p-3 text-base focus:border-primaire focus:outline-none"
            />
          </div>

          <Bouton type="submit" chargement={chargement} className="w-full">
            Soumettre ma demande
          </Bouton>
        </form>
      </Carte>
    </div>
  );
}
