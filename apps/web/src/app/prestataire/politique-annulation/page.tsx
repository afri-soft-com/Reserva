"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { Champ } from "../../../components/Champ";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { obtenirMonProfilPrestataire, modifierProfilPrestataire } from "../../../lib/api-prestataires";

export default function PagePolitiqueAnnulation() {
  const [chargement, setChargement] = useState(true);
  const [chargementAction, setChargementAction] = useState(false);
  const [delai, setDelai] = useState("24");
  const [frais, setFrais] = useState("50");

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    try {
      const profil = await obtenirMonProfilPrestataire();
      setDelai(String(profil.delaiAnnulationGratuiteHeures ?? 24));
      setFrais(String(profil.fraisAnnulationTardivePourcent ?? 50));
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function enregistrer() {
    const delaiNum = Number(delai);
    const fraisNum = Number(frais);
    if (!Number.isInteger(delaiNum) || delaiNum < 0 || delaiNum > 168) {
      toastErreur("Le délai doit être un nombre entier entre 0 et 168 heures");
      return;
    }
    if (!Number.isInteger(fraisNum) || fraisNum < 0 || fraisNum > 100) {
      toastErreur("Le pourcentage de frais doit être un nombre entier entre 0 et 100");
      return;
    }
    setChargementAction(true);
    try {
      await modifierProfilPrestataire({
        delaiAnnulationGratuiteHeures: delaiNum,
        fraisAnnulationTardivePourcent: fraisNum,
      });
      toastSucces("Politique d'annulation mise à jour !");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementAction(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Politique d'annulation</h1>
          <p className="text-sm text-gray-500">
            Définissez les conditions de remboursement appliquées aux annulations de vos clients
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/prestataire/indisponibilites" className="text-sm font-semibold text-primaire hover:underline">
            Jours bloqués
          </Link>
        </div>
      </div>

      {chargement && <p className="text-gray-500">Chargement...</p>}

      {!chargement && (
        <Carte>
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primaire" />
            <h2 className="font-bold text-gray-900">Conditions de remboursement</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ
              libelle="Annulation gratuite jusqu'à (en heures)"
              type="number"
              min={0}
              max={168}
              required
              value={delai}
              onChange={(e) => setDelai(e.target.value)}
              placeholder="Ex : 24"
              aide="Tant que l'annulation a lieu au moins N heures avant le créneau, elle est gratuite (0 à 168 h)."
            />
            <Champ
              libelle="Frais d'annulation tardive (en % du montant)"
              type="number"
              min={0}
              max={100}
              required
              value={frais}
              onChange={(e) => setFrais(e.target.value)}
              placeholder="Ex : 50"
              aide="Ce pourcentage est retenu sur le montant payé en cas d'annulation après le délai (0 à 100 %)."
            />
          </div>
          <div className="mt-4">
            <Bouton onClick={enregistrer} chargement={chargementAction}>
              Enregistrer la politique
            </Bouton>
          </div>
        </Carte>
      )}
    </div>
  );
}
