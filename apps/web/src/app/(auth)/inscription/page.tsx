"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "../../../components/Bouton";
import { Champ } from "../../../components/Champ";
import { toastSucces, toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { inscrire, verifierOtp, definirPin, renvoyerOtp } from "../../../lib/api-auth";
import { useAuthStore } from "../../../lib/store-auth";

type Etape = "FORMULAIRE" | "OTP" | "PIN";

export default function PageInscription() {
  const router = useRouter();
  const connecterStore = useAuthStore((etat) => etat.connecter);

  const [etape, setEtape] = useState<Etape>("FORMULAIRE");
  const [chargement, setChargement] = useState(false);
  const [telephone, setTelephone] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [codeOtp, setCodeOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmationPin, setConfirmationPin] = useState("");

  async function gererSoumissionFormulaire(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    try {
      await inscrire({ telephone, nom, email: email || undefined, langue: "fr" });
      toastSucces("Un code de vérification a été envoyé par SMS.");
      setEtape("OTP");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function gererVerificationOtp(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    try {
      await verifierOtp({ telephone, code: codeOtp });
      toastSucces("Numéro vérifié avec succès !");
      setEtape("PIN");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function gererRenvoiOtp() {
    try {
      await renvoyerOtp(telephone);
      toastSucces("Un nouveau code a été envoyé.");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    }
  }

  async function gererDefinitionPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== confirmationPin) {
      toastErreur("Les deux codes PIN ne correspondent pas.");
      return;
    }
    setChargement(true);
    try {
      const resultat = await definirPin({ telephone, pin });
      connecterStore(resultat.token, resultat.utilisateur);
      toastSucces("Bienvenue sur RESERVA !");
      router.push("/services");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-card bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <h1 className="mb-1 text-2xl font-bold text-primaire-700">Créer un compte</h1>
        <p className="mb-6 text-sm text-gray-500">
          {etape === "FORMULAIRE" && "Quelques informations pour commencer."}
          {etape === "OTP" && `Entrez le code envoyé au ${telephone}`}
          {etape === "PIN" && "Choisissez un code PIN à 4 chiffres pour vos prochaines connexions."}
        </p>

        {etape === "FORMULAIRE" && (
          <form onSubmit={gererSoumissionFormulaire} className="space-y-4">
            <Champ libelle="Nom complet" placeholder="Ex: Jean Mukendi" value={nom} onChange={(e) => setNom(e.target.value)} required />
            <Champ
              libelle="Numéro de téléphone"
              placeholder="Ex: 0991234567"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              required
            />
            <Champ
              libelle="Email (optionnel)"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Bouton type="submit" chargement={chargement} className="w-full">
              Continuer
            </Bouton>
          </form>
        )}

        {etape === "OTP" && (
          <form onSubmit={gererVerificationOtp} className="space-y-4">
            <Champ
              libelle="Code de vérification"
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              value={codeOtp}
              onChange={(e) => setCodeOtp(e.target.value)}
              required
            />
            <Bouton type="submit" chargement={chargement} className="w-full">
              Vérifier
            </Bouton>
            <button type="button" onClick={gererRenvoiOtp} className="w-full text-center text-sm text-primaire hover:underline">
              Renvoyer le code
            </button>
          </form>
        )}

        {etape === "PIN" && (
          <form onSubmit={gererDefinitionPin} className="space-y-4">
            <Champ
              libelle="Code PIN (4 chiffres)"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
            <Champ
              libelle="Confirmez le code PIN"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmationPin}
              onChange={(e) => setConfirmationPin(e.target.value)}
              required
            />
            <Bouton type="submit" chargement={chargement} className="w-full">
              Terminer l&apos;inscription
            </Bouton>
          </form>
        )}
      </div>
    </div>
  );
}
