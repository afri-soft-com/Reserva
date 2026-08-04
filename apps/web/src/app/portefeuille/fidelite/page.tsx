"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, ChevronLeft, RefreshCw } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import {
  obtenirSoldeFidelite,
  obtenirHistoriqueFidelite,
  SoldeFidelite,
  TransactionPoints,
} from "../../../lib/api-fidelite";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PageFidelite() {
  const router = useRouter();
  const [solde, setSolde] = useState<SoldeFidelite | null>(null);
  const [transactions, setTransactions] = useState<TransactionPoints[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [chargement, setChargement] = useState(true);

  async function charger(avecHistorique = true, pageDemandee = page) {
    try {
      const nouveauSolde = await obtenirSoldeFidelite();
      setSolde(nouveauSolde);
      if (avecHistorique) {
        const historique = await obtenirHistoriqueFidelite(pageDemandee, 20);
        setTotal(historique.total);
        if (pageDemandee === 1) {
          setTransactions(historique.items);
        } else {
          setTransactions((precedentes) => [...precedentes, ...historique.items]);
        }
      }
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, [page]);

  async function chargerPlus() {
    setChargement(true);
    const prochainePage = page + 1;
    setPage(prochainePage);
    await charger(true, prochainePage);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programme fidélité</h1>
          <p className="text-sm text-gray-500">Vos points RESERVA et leur historique.</p>
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

      <Carte className="bg-gradient-to-br from-accent to-amber-600 text-white">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          <p className="text-sm font-medium text-amber-100">Points RESERVA</p>
        </div>
        <p className="mt-2 text-3xl font-bold">{solde?.solde ?? 0} pts</p>
        <p className="text-xs text-amber-100">≈ {(solde?.valeurEnFC ?? 0).toLocaleString("fr-FR")} FC</p>
      </Carte>

      <Carte>
        <h2 className="mb-3 font-bold text-gray-900">Historique des points</h2>
        {chargement && <p className="text-gray-500">Chargement...</p>}
        {!chargement && transactions.length === 0 && (
          <p className="text-sm text-gray-500">Aucune transaction de points pour le moment.</p>
        )}
        <div className="divide-y divide-gray-100">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t.description || (t.type === "GAIN" ? "Gain de points" : "Dépense de points")}
                </p>
                <p className="text-xs text-gray-500">{formatDate(t.creeLe)}</p>
              </div>
              <div className="text-right">
                <p
                  className={
                    t.type === "GAIN"
                      ? "font-bold text-emerald-600"
                      : "font-bold text-red-500"
                  }
                >
                  {t.type === "GAIN" ? "+" : "-"}{t.montantPoints} pts
                </p>
                <p className="text-xs text-gray-400">Solde : {t.soldeApres}</p>
              </div>
            </div>
          ))}
        </div>
        {!chargement && transactions.length < total && (
          <div className="mt-3 flex justify-center">
            <Bouton variante="secondaire" onClick={chargerPlus}>
              Afficher plus
            </Bouton>
          </div>
        )}
      </Carte>
    </div>
  );
}
