"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "../../../components/Bouton";
import { Champ } from "../../../components/Champ";
import { Carte } from "../../../components/Carte";
import { toastSucces, toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { demanderReinitialisationPin, reinitialiserPin } from "../../../lib/api-auth";
import { useAuthStore } from "../../../lib/store-auth";

type Etape = "TELEPHONE" | "OTP" | "PIN";

export default function PageReinitialiserPin() {
  const router = useRouter();
  const connecterStore = useAuthStore((etat) => etat.connecter);

  const [etape, setEtape] = useState<Etape>("TELEPHONE");
  const [telephone, setTelephone] = useState("");
  const [code, setCode] = useState("");
  const [nouveauPin, setNouveauPin] = useState("");
  const [confirmationPin, setConfirmationPin] = useState("");
  const [chargement, setChargement] = useState(false);

  async function gererDemande(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    try {
      await demanderReinitialisationPin(telephone);
      toastSucces("Un code de réinitialisation a été envoyé par SMS.");
      setEtape("OTP");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function gererReinitialisation(e: React.FormEvent) {
    e.preventDefault();
    if (nouveauPin !== confirmationPin) {
      toastErreur("Les deux codes PIN ne correspondent pas.");
      return;
    }
    setChargement(true);
    try {
      const resultat = await reinitialiserPin({ telephone, code, nouveauPin });
      connecterStore(resultat.token, resultat.utilisateur);
      toastSucces("Code PIN réinitialisé avec succès !");
      router.push("/services");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Carte>
        <h1 className="mb-1 text-2xl font-bold text-primaire-700">Réinitialiser le code PIN</h1>
        <p className="mb-6 text-sm text-gray-500">
          {etape === "TELEPHONE" && "Entrez votre numéro de téléphone pour recevoir un code de réinitialisation."}
          {etape === "OTP" && `Entrez le code envoyé au ${telephone}`}
          {etape === "PIN" && "Choisissez un nouveau code PIN à 4 chiffres."}
        </p>

        {etape === "TELEPHONE" && (
          <form onSubmit={gererDemande} className="space-y-4">
            <Champ
              libelle="Numéro de téléphone"
              placeholder="Ex: 0991234567"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              required
            />
            <Bouton type="submit" chargement={chargement} className="w-full">
              Envoyer le code
            </Bouton>
          </form>
        )}

        {etape === "OTP" && (
          <form onSubmit={gererReinitialisation} className="space-y-4">
            <Champ
              libelle="Code de réinitialisation"
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Bouton type="submit" chargement={chargement} className="w-full">
              Vérifier
            </Bouton>
          </form>
        )}

        {etape === "PIN" && (
          <form onSubmit={gererReinitialisation} className="space-y-4">
            <Champ
              libelle="Nouveau code PIN (4 chiffres)"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={nouveauPin}
              onChange={(e) => setNouveauPin(e.target.value)}
              required
            />
            <Champ
              libelle="Confirmez le nouveau code PIN"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmationPin}
              onChange={(e) => setConfirmationPin(e.target.value)}
              required
            />
            <Bouton type="submit" chargement={chargement} className="w-full">
              Réinitialiser le PIN
            </Bouton>
          </form>
        )}
      </Carte>
    </div>
  );
}
