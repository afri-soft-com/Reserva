"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Gift, Coins, Ticket, ArrowDownLeft, ArrowUpRight, ChevronLeft } from "lucide-react";
import { Carte } from "../../components/Carte";
import { toastErreur } from "../../components/Toast";
import { extraireMessageErreur } from "../../lib/api-client";
import { obtenirPortefeuille, PortefeuilleReponse, LigneHistorique } from "../../lib/api-portefeuille";
import { formaterMontant } from "@reserva/shared";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function iconeType(type: string) {
  switch (type) {
    case "PAIEMENT":
      return <ArrowDownLeft className="h-4 w-4" />;
    case "POINTS":
      return <Coins className="h-4 w-4" />;
    case "AVOIR":
      return <Gift className="h-4 w-4" />;
    default:
      return <Ticket className="h-4 w-4" />;
  }
}

function montantLigne(l: LigneHistorique) {
  if (l.type === "POINTS") {
    const signe = l.sens === "DEPENSE" ? "-" : "+";
    return <span className="font-semibold text-primaire-700">{signe}{l.points} pts</span>;
  }
  if (l.montant === undefined) return null;
  const devise = l.devise || "CDF";
  return (
    <span className="font-semibold text-emerald-600">
      {formaterMontant(l.montant, devise)}
      {l.restant !== undefined && <span className="ml-1 text-xs font-normal text-gray-500">(reste {l.restant})</span>}
    </span>
  );
}

export default function PagePortefeuille() {
  const router = useRouter();
  const [donnees, setDonnees] = useState<PortefeuilleReponse | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await obtenirPortefeuille();
      setDonnees(resultat);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  if (chargement) return <p className="text-gray-500">Chargement...</p>;
  if (!donnees) return <p className="text-gray-500">Aucune donnée disponible.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon portefeuille</h1>
          <p className="text-sm text-gray-500">Vos avoirs, points de fidélité et cartes cadeaux en un seul endroit.</p>
        </div>
        <button
          onClick={() => router.push("/profil")}
          className="flex items-center gap-1 text-sm font-medium text-primaire-700 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Retour au profil
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Carte className="bg-gradient-to-br from-primaire to-primaire-700 text-white">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <p className="text-sm font-medium text-primaire-100">Avoirs disponibles</p>
          </div>
          <p className="mt-2 text-2xl font-bold">{formaterMontant(donnees.avoirs.solde, donnees.avoirs.devise)}</p>
          <p className="text-xs text-primaire-100">{donnees.avoirs.nombre} avoir(s) au total</p>
        </Carte>

        <button onClick={() => router.push("/portefeuille/fidelite")} className="text-left">
          <Carte className="h-full bg-gradient-to-br from-accent to-amber-600 text-white transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              <p className="text-sm font-medium text-amber-100">Points fidélité</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{donnees.fidelite.points} pts</p>
            <p className="text-xs text-amber-100">≈ {formaterMontant(donnees.fidelite.valeurEnFC, "CDF")}</p>
          </Carte>
        </button>

        <button onClick={() => router.push("/portefeuille/cartes-cadeaux")} className="text-left">
          <Carte className="h-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              <p className="text-sm font-medium text-emerald-100">Cartes cadeaux</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{formaterMontant(donnees.cartesCadeaux.solde, "CDF")}</p>
            <p className="text-xs text-emerald-100">{donnees.cartesCadeaux.nombre} carte(s)</p>
          </Carte>
        </button>
      </div>

      <Carte>
        <h2 className="mb-3 font-bold text-gray-900">Historique récent</h2>
        {donnees.historique.length === 0 && <p className="text-sm text-gray-500">Aucune transaction enregistrée.</p>}
        <div className="divide-y divide-gray-100">
          {donnees.historique.map((l, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primaire-50 text-primaire-700">
                  {iconeType(l.type)}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{l.libelle}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(l.date)}
                    {l.reference ? ` · ${l.reference}` : ""}
                  </p>
                </div>
              </div>
              {montantLigne(l)}
            </div>
          ))}
        </div>
      </Carte>
    </div>
  );
}
