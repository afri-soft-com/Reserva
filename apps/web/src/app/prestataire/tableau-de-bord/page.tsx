"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, TrendingUp, Star, Clock, Package } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { BadgeStatutReservation } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { obtenirTableauDeBord, obtenirMonProfilPrestataire, TableauDeBordReponse } from "../../../lib/api-prestataires";
import { formaterMontant } from "@reserva/shared";

export default function PageTableauDeBordPrestataire() {
  const [donnees, setDonnees] = useState<TableauDeBordReponse | null>(null);
  const [statutPrestataire, setStatutPrestataire] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    try {
      const profil = await obtenirMonProfilPrestataire();
      setStatutPrestataire(profil.statut);
      if (profil.statut === "APPROUVE") {
        const tableau = await obtenirTableauDeBord();
        setDonnees(tableau);
      }
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  if (chargement) return <p className="text-gray-500">Chargement...</p>;

  if (statutPrestataire === "EN_ATTENTE_VALIDATION") {
    return (
      <Carte className="mx-auto max-w-lg text-center">
        <Clock className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h1 className="mb-2 text-xl font-bold text-gray-900">Demande en cours d&apos;examen</h1>
        <p className="text-gray-600">
          Votre profil prestataire est en attente de validation par l&apos;équipe RESERVA. Vous recevrez une notification dès qu&apos;il sera approuvé.
        </p>
      </Carte>
    );
  }

  if (statutPrestataire === "REJETE") {
    return (
      <Carte className="mx-auto max-w-lg text-center">
        <h1 className="mb-2 text-xl font-bold text-alerte">Demande rejetée</h1>
        <p className="text-gray-600">Contactez le support RESERVA pour plus d&apos;informations sur le motif du rejet.</p>
      </Carte>
    );
  }

  if (!donnees) return <p className="text-gray-500">Aucune donnée disponible.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <div className="flex gap-3">
          <Link href="/prestataire/statistiques">
            <Bouton variante="secondaire">
              <TrendingUp className="h-4 w-4" /> Statistiques
            </Bouton>
          </Link>
          <Link href="/prestataire/calendrier">
            <Bouton variante="secondaire">
              <Calendar className="h-4 w-4" /> Calendrier
            </Bouton>
          </Link>
          <Link href="/prestataire/services">
            <Bouton variante="secondaire">
              <Package className="h-4 w-4" /> Gérer mes services
            </Bouton>
          </Link>
          <Link href="/prestataire/reservations">
            <Bouton>
              <Calendar className="h-4 w-4" /> Toutes les réservations
            </Bouton>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Carte>
          <p className="text-sm text-gray-500">Réservations cette semaine</p>
          <p className="text-2xl font-bold text-primaire-700">{donnees.statistiques.totalReservationsSemaine}</p>
        </Carte>
        <Carte>
          <p className="text-sm text-gray-500">Réservations ce mois</p>
          <p className="text-2xl font-bold text-primaire-700">{donnees.statistiques.totalReservationsMois}</p>
        </Carte>
        <Carte>
          <p className="flex items-center gap-1 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" /> Revenus du mois
          </p>
          <p className="text-2xl font-bold text-emerald-600">{formaterMontant(donnees.statistiques.revenusMoisEnCours, "CDF")}</p>
        </Carte>
        <Carte>
          <p className="flex items-center gap-1 text-sm text-gray-500">
            <Star className="h-4 w-4 fill-accent text-accent" /> Note moyenne
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {donnees.statistiques.noteMoyenne.toFixed(1)}{" "}
            <span className="text-sm font-normal text-gray-500">({donnees.statistiques.nombreAvis} avis)</span>
          </p>
        </Carte>
      </div>

      {donnees.statistiques.reservationsEnAttenteAction > 0 && (
        <Carte className="border-2 border-amber-300 bg-amber-50">
          <p className="font-semibold text-amber-800">
            {donnees.statistiques.reservationsEnAttenteAction} réservation(s) en attente de votre confirmation
          </p>
          <Link href="/prestataire/reservations?statut=EN_ATTENTE" className="text-sm font-semibold text-amber-700 hover:underline">
            Voir les demandes →
          </Link>
        </Carte>
      )}

      <Carte>
        <h2 className="mb-3 font-bold text-gray-900">Réservations d&apos;aujourd&apos;hui</h2>
        {donnees.reservationsAujourdhui.length === 0 && (
          <p className="text-sm text-gray-500">Aucune réservation prévue aujourd&apos;hui.</p>
        )}
        <div className="space-y-3">
          {donnees.reservationsAujourdhui.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{r.service.nom}</p>
                <p className="text-sm text-gray-500">
                  {r.client.nom} — {new Date(r.creneau.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <BadgeStatutReservation statut={r.statut} />
            </div>
          ))}
        </div>
      </Carte>
    </div>
  );
}
