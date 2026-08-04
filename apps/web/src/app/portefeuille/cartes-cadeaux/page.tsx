"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, ChevronLeft, UserPlus, RefreshCw } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { Champ } from "../../../components/Champ";
import { toastSucces, toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import {
  obtenirMesCartesCadeaux,
  CarteCadeau,
  acheterCarteCadeau,
  transfererCarteCadeau,
} from "../../../lib/api-cartes-cadeaux";

function formaterMontant(montant: number, devise: string) {
  if (devise === "USD") return `$${montant.toFixed(2)}`;
  return `${Math.round(montant).toLocaleString("fr-FR")} FC`;
}

export default function PageCartesCadeaux() {
  const router = useRouter();
  const [cartes, setCartes] = useState<CarteCadeau[]>([]);
  const [soldeTotal, setSoldeTotal] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [enAchat, setEnAchat] = useState(false);
  const [montantAchat, setMontantAchat] = useState("");
  const [telephoneAchat, setTelephoneAchat] = useState("");
  const [telephoneTransfert, setTelephoneTransfert] = useState<Record<string, string>>({});
  const [transfertEnCours, setTransfertEnCours] = useState<string | null>(null);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await obtenirMesCartesCadeaux();
      setCartes(resultat.cartes);
      setSoldeTotal(resultat.soldeTotal);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function gererAchat() {
    const montant = Number(montantAchat);
    if (!montant || montant <= 0) {
      toastErreur("Veuillez saisir un montant valide.");
      return;
    }
    setEnAchat(true);
    try {
      await acheterCarteCadeau({
        montant,
        devise: "CDF",
        beneficiaireTelephone: telephoneAchat.trim() || undefined,
      });
      toastSucces("Carte cadeau achetée avec succès !");
      setMontantAchat("");
      setTelephoneAchat("");
      await charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setEnAchat(false);
    }
  }

  async function gererTransfert(carteId: string) {
    const telephone = (telephoneTransfert[carteId] || "").trim();
    if (!telephone) {
      toastErreur("Veuillez saisir le téléphone du destinataire.");
      return;
    }
    setTransfertEnCours(carteId);
    try {
      await transfererCarteCadeau(carteId, telephone);
      toastSucces("Carte offerte avec succès !");
      setTelephoneTransfert((p) => ({ ...p, [carteId]: "" }));
      await charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setTransfertEnCours(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes cartes cadeaux</h1>
          <p className="text-sm text-gray-500">Achetez et offrez des cartes cadeaux RESERVA.</p>
        </div>
        <div className="flex items-center gap-2">
          <Bouton variante="fantome" taille="sm" onClick={() => charger()}>
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Bouton>
          <Bouton variante="fantome" taille="sm" onClick={() => router.push("/portefeuille")}>
            <ChevronLeft className="h-4 w-4" /> Portefeuille
          </Bouton>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Carte className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            <p className="text-sm font-medium text-emerald-100">Solde disponible</p>
          </div>
          <p className="mt-2 text-2xl font-bold">{formaterMontant(soldeTotal, "CDF")}</p>
          <p className="text-xs text-emerald-100">{cartes.length} carte(s)</p>
        </Carte>

        <Carte>
          <h3 className="mb-2 font-bold text-gray-900">Acheter une carte</h3>
          <div className="space-y-2">
            <Champ
              placeholder="Montant (FC)"
              type="number"
              value={montantAchat}
              onChange={(e) => setMontantAchat(e.target.value)}
            />
            <Champ
              placeholder="Téléphone du destinataire (optionnel)"
              value={telephoneAchat}
              onChange={(e) => setTelephoneAchat(e.target.value)}
            />
            <Bouton onClick={gererAchat} chargement={enAchat} className="w-full">
              <Gift className="h-4 w-4" /> Acheter
            </Bouton>
          </div>
        </Carte>
      </div>

      <h2 className="text-lg font-bold text-gray-900">Vos cartes</h2>
      {chargement && <p className="text-gray-500">Chargement...</p>}
      {!chargement && cartes.length === 0 && (
        <Carte className="text-center text-gray-500">Aucune carte cadeau pour le moment.</Carte>
      )}

      <div className="space-y-3">
        {cartes.map((carte) => {
          return (
            <Carte key={carte.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-lg font-bold tracking-widest text-gray-900">{carte.code}</p>
                  <p className="text-sm text-gray-500">
                    Solde : <span className="font-semibold text-emerald-600">{formaterMontant(carte.solde, carte.devise)}</span>
                    {carte.dateExpiration && (
                      <span> · Expire le {new Date(carte.dateExpiration).toLocaleDateString("fr-FR")}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Bénéficiaire : {carte.beneficiaire?.nom ?? "Vous"}
                    {carte.beneficiaireId === undefined && carte.acheteur?.nom && ` (achetée par ${carte.acheteur.nom})`}
                  </p>
                </div>
                <span
                  className={
                    carte.actif
                      ? "inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                      : "inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                  }
                >
                  {carte.actif ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              {carte.actif && carte.beneficiaireId === undefined && (
                <div className="mt-3 flex items-end gap-2">
                  <Champ
                    placeholder="Téléphone du destinataire"
                    value={telephoneTransfert[carte.id] || ""}
                    onChange={(e) =>
                      setTelephoneTransfert((p) => ({ ...p, [carte.id]: e.target.value }))
                    }
                  />
                  <Bouton
                    variante="secondaire"
                    taille="sm"
                    chargement={transfertEnCours === carte.id}
                    onClick={() => gererTransfert(carte.id)}
                  >
                    <UserPlus className="h-4 w-4" /> Offrir
                  </Bouton>
                </div>
              )}
            </Carte>
          );
        })}
      </div>
    </div>
  );
}
