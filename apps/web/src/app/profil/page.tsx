"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, Camera, Smartphone, Shield, Wallet, Heart, Bell, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Carte } from "../../components/Carte";
import { Bouton } from "../../components/Bouton";
import { Champ } from "../../components/Champ";
import { toastSucces, toastErreur } from "../../components/Toast";
import { extraireMessageErreur } from "../../lib/api-client";
import { mettreAJourPhoto, definir2FA } from "../../lib/api-auth";
import { useAuthStore } from "../../lib/store-auth";

export default function PageProfil() {
  const router = useRouter();
  const { utilisateur, estConnecte, deconnecter, rafraichirProfil } = useAuthStore();
  const [photoUrl, setPhotoUrl] = useState(utilisateur?.photoUrl || "");
  const [chargementPhoto, setChargementPhoto] = useState(false);
  const [chargement2FA, setChargement2FA] = useState(false);

  useEffect(() => {
    if (!estConnecte) {
      router.push("/connexion");
    }
  }, [estConnecte, router]);

  if (!utilisateur) return <p className="text-gray-500">Chargement...</p>;

  async function gererMiseAJourPhoto() {
    if (!utilisateur || !photoUrl.trim()) return;
    setChargementPhoto(true);
    try {
      await mettreAJourPhoto(photoUrl);
      await rafraichirProfil();
      toastSucces("Photo de profil mise à jour !");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementPhoto(false);
    }
  }

  async function gererBasculer2FA() {
    if (!utilisateur) return;
    setChargement2FA(true);
    try {
      const nouveauProfil = await definir2FA(!utilisateur.deuxFAActif);
      await rafraichirProfil();
      toastSucces(nouveauProfil.deuxFAActif ? "2FA activé" : "2FA désactivé");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement2FA(false);
    }
  }

  function gererDeconnexion() {
    deconnecter();
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>

      <Carte>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primaire-50">
            {utilisateur.photoUrl ? (
              <img src={utilisateur.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-primaire" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{utilisateur.nom}</h2>
            <p className="text-sm text-gray-500">{utilisateur.telephone}</p>
            {utilisateur.email && <p className="text-sm text-gray-500">{utilisateur.email}</p>}
          </div>
        </div>
      </Carte>

      <Carte>
        <h3 className="mb-3 font-bold text-gray-900">
          <Camera className="mr-1.5 inline h-4 w-4" />
          Photo de profil
        </h3>
        <div className="flex gap-3">
          <Champ
            placeholder="URL de la photo"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
          />
          <Bouton onClick={gererMiseAJourPhoto} chargement={chargementPhoto}>
            Enregistrer
          </Bouton>
        </div>
      </Carte>

      <Carte>
        <h3 className="mb-3 font-bold text-gray-900">
          <Smartphone className="mr-1.5 inline h-4 w-4" />
          Sécurité
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Authentification à deux facteurs</p>
            <p className="text-sm text-gray-500">
              {utilisateur.deuxFAActif ? "Activée" : "Désactivée"}
            </p>
          </div>
          <Bouton
            variante={utilisateur.deuxFAActif ? "destructif" : "primaire"}
            taille="sm"
            chargement={chargement2FA}
            onClick={gererBasculer2FA}
          >
            {utilisateur.deuxFAActif ? "Désactiver" : "Activer"}
          </Bouton>
        </div>
      </Carte>

      <Carte>
        <Link href="/portefeuille" className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primaire-50 text-primaire">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-gray-900">Mon portefeuille</p>
              <p className="text-sm text-gray-500">Avoirs, points fidélité, cartes cadeaux</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
      </Carte>

      <Carte>
        <Link href="/favoris" className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-gray-900">Mes favoris</p>
              <p className="text-sm text-gray-500">Services enregistrés</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
      </Carte>

      <Carte>
        <Link href="/notifications" className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primaire-50 text-primaire">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-gray-900">Notifications</p>
              <p className="text-sm text-gray-500">Suivi de vos réservations et alertes</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
      </Carte>

      <Carte>
        <Bouton variante="destructif" onClick={gererDeconnexion} className="w-full">
          <LogOut className="h-4 w-4" /> Se déconnecter
        </Bouton>
      </Carte>
    </div>
  );
}
