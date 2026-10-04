"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bouton } from "../../../components/Bouton";
import { Champ } from "../../../components/Champ";
import { Carte } from "../../../components/Carte";
import { toastSucces, toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { connecter, verifier2FA } from "../../../lib/api-auth";
import { useAuthStore } from "../../../lib/store-auth";

export default function PageConnexion() {
  const router = useRouter();
  const connecterStore = useAuthStore((etat) => etat.connecter);
  const deconnecterStore = useAuthStore((etat) => etat.deconnecter);

  const [telephone, setTelephone] = useState("");
  const [pin, setPin] = useState("");
  const [chargement, setChargement] = useState(false);
  const [deuxfaRequis, setDeuxfaRequis] = useState(false);
  const [code2FA, setCode2FA] = useState("");
  const [message2FA, setMessage2FA] = useState("");

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    try {
      const resultat: any = await connecter({ telephone, pin });
      if (resultat.deuxfaRequis) {
        setDeuxfaRequis(true);
        setMessage2FA(resultat.message);
        toastSucces(resultat.message);
      } else {
        if (resultat.utilisateur.role !== "ADMIN") {
          deconnecterStore();
          toastErreur("La console web est réservée aux administrateurs. Utilisez l'application mobile.");
          return;
        }
        connecterStore(resultat.token, resultat.utilisateur);
        toastSucces(`Bon retour, ${resultat.utilisateur.nom} !`);
        router.push("/admin/pilotage");
      }
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function gererVerification2FA(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    try {
      const resultat = await verifier2FA({ telephone, code: code2FA });
      if (resultat.utilisateur.role !== "ADMIN") {
        deconnecterStore();
        toastErreur("La console web est réservée aux administrateurs. Utilisez l'application mobile.");
        return;
      }
      connecterStore(resultat.token, resultat.utilisateur);
      toastSucces(`Bon retour, ${resultat.utilisateur.nom} !`);
      router.push("/admin/pilotage");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  if (deuxfaRequis) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <Carte>
          <h1 className="mb-1 text-2xl font-bold text-primaire-700">Vérification en deux étapes</h1>
          <p className="mb-6 text-sm text-gray-500">{message2FA}</p>

          <form onSubmit={gererVerification2FA} className="space-y-4">
            <Champ
              libelle="Code de vérification"
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              value={code2FA}
              onChange={(e) => setCode2FA(e.target.value)}
              required
            />
            <Bouton type="submit" chargement={chargement} className="w-full">
              Vérifier
            </Bouton>
          </form>
        </Carte>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Carte>
        <h1 className="mb-1 text-2xl font-bold text-primaire-700">Connexion administrateur</h1>
        <p className="mb-6 text-sm text-gray-500">Console web réservée à l&apos;équipe RESERVA. Clients et prestataires passent par l&apos;app mobile.</p>

        <form onSubmit={gererSoumission} className="space-y-4">
          <Champ
            libelle="Numéro de téléphone"
            placeholder="Ex: 0991234567"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            required
          />
          <Champ
            libelle="Code PIN"
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
          />
          <Bouton type="submit" chargement={chargement} className="w-full">
            Se connecter
          </Bouton>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link href="/reinitialiser-pin" className="font-semibold text-primaire hover:underline">
            Mot de passe oublié ?
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-gray-500">
          Compte client ou prestataire ? Installez RESERVA sur Android ou iOS.
        </p>
      </Carte>
    </div>
  );
}
