"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Carte } from "../../components/Carte";
import { BadgeStatutReservation, BadgeStatutPaiement } from "../../components/Carte";
import { toastErreur } from "../../components/Toast";
import { extraireMessageErreur } from "../../lib/api-client";
import { listerMesReservations, ReservationDetaillee } from "../../lib/api-reservations";
import { formaterMontant } from "@reserva/shared";

export default function PageMesReservations() {
  const [reservations, setReservations] = useState<ReservationDetaillee[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    chargerReservations();
  }, []);

  async function chargerReservations() {
    setChargement(true);
    try {
      const resultat = await listerMesReservations();
      setReservations(resultat);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mes réservations</h1>

      {chargement && <p className="text-gray-500">Chargement...</p>}

      {!chargement && reservations.length === 0 && (
        <Carte className="text-center text-gray-500">
          Vous n&apos;avez aucune réservation pour le moment.{" "}
          <Link href="/services" className="font-semibold text-primaire hover:underline">
            Trouver un service
          </Link>
        </Carte>
      )}

      <div className="space-y-3">
        {reservations.map((reservation) => (
          <Link key={reservation.id} href={`/reservations/${reservation.id}`}>
            <Carte className="transition-transform hover:-translate-y-0.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-400">Réf. {reservation.numero}</p>
                  <h3 className="font-bold text-gray-900">{reservation.service.nom}</h3>
                  <p className="text-sm text-gray-600">{reservation.prestataire.nomEntreprise}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <BadgeStatutReservation statut={reservation.statut} />
                  <BadgeStatutPaiement statut={reservation.statutPaiement} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(reservation.creneau.debut).toLocaleString("fr-FR")}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {reservation.prestataire.ville}
                </span>
                <span className="font-semibold text-primaire-700">
                  {formaterMontant(reservation.montantTotal, reservation.devise)}
                </span>
              </div>
            </Carte>
          </Link>
        ))}
      </div>
    </div>
  );
}
