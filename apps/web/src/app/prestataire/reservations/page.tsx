"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, Phone, FileDown } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { BadgeStatutReservation } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import {
  listerReservationsRecues,
  repondreReservation,
  cloturerReservation,
  ReservationDetaillee,
} from "../../../lib/api-reservations";
import { telechargerRapportReservationsPdf } from "../../../lib/api-paiements";
import { formaterMontant } from "@reserva/shared";

function ContenuReservationsRecues() {
  const params = useSearchParams();
  const statutInitial = params.get("statut") || undefined;

  const [reservations, setReservations] = useState<ReservationDetaillee[]>([]);
  const [filtreStatut, setFiltreStatut] = useState<string | undefined>(statutInitial);
  const [chargement, setChargement] = useState(true);
  const [chargementAction, setChargementAction] = useState<string | null>(null);
  const [chargementExport, setChargementExport] = useState<string | null>(null);

  async function exporterPdf(periode: "jour" | "semaine" | "mois") {
    setChargementExport(periode);
    try {
      await telechargerRapportReservationsPdf(periode);
      toastSucces("Rapport PDF téléchargé.");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementExport(null);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtreStatut]);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await listerReservationsRecues(filtreStatut);
      setReservations(resultat);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function gererReponse(reservationId: string, accepter: boolean) {
    setChargementAction(reservationId);
    try {
      await repondreReservation(reservationId, accepter);
      toastSucces(accepter ? "Réservation confirmée." : "Réservation refusée.");
      await charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementAction(null);
    }
  }

  async function gererCloture(reservationId: string, statut: "TERMINEE" | "ABSENCE") {
    setChargementAction(reservationId);
    try {
      await cloturerReservation(reservationId, statut);
      toastSucces(statut === "TERMINEE" ? "Réservation clôturée." : "Absence enregistrée.");
      await charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementAction(null);
    }
  }

  const filtres = [
    { valeur: undefined, libelle: "Toutes" },
    { valeur: "EN_ATTENTE", libelle: "En attente" },
    { valeur: "CONFIRMEE", libelle: "Confirmées" },
    { valeur: "TERMINEE", libelle: "Terminées" },
    { valeur: "ANNULEE", libelle: "Annulées" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Réservations reçues</h1>

      <div className="flex flex-wrap gap-2">
        {filtres.map((f) => (
          <button
            key={f.libelle}
            onClick={() => setFiltreStatut(f.valeur)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filtreStatut === f.valeur ? "bg-primaire text-white" : "bg-white text-gray-700"
            }`}
          >
            {f.libelle}
          </button>
        ))}
      </div>

      <Carte className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-gray-800">
            <FileDown className="h-4 w-4 text-primaire-700" /> Exporter le rapport (PDF)
          </p>
          <p className="text-sm text-gray-500">Téléchargez la liste de vos réservations sur une période.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Bouton taille="sm" variante="secondaire" chargement={chargementExport === "jour"} onClick={() => exporterPdf("jour")}>
            Aujourd'hui
          </Bouton>
          <Bouton taille="sm" variante="secondaire" chargement={chargementExport === "semaine"} onClick={() => exporterPdf("semaine")}>
            Cette semaine
          </Bouton>
          <Bouton taille="sm" chargement={chargementExport === "mois"} onClick={() => exporterPdf("mois")}>
            Ce mois
          </Bouton>
        </div>
      </Carte>

      {chargement && <p className="text-gray-500">Chargement...</p>}
      {!chargement && reservations.length === 0 && <Carte className="text-center text-gray-500">Aucune réservation trouvée.</Carte>}

      <div className="space-y-3">
        {reservations.map((reservation) => (
          <Carte key={reservation.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-gray-400">Réf. {reservation.numero}</p>
                <h3 className="font-bold text-gray-900">{reservation.service.nom}</h3>
                <p className="flex items-center gap-1 text-sm text-gray-600">
                  {(reservation as any).client?.nom}
                  <span className="flex items-center gap-1 text-gray-400">
                    <Phone className="h-3 w-3" /> {(reservation as any).client?.telephone}
                  </span>
                </p>
              </div>
              <BadgeStatutReservation statut={reservation.statut} />
            </div>

            <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="h-4 w-4" /> {new Date(reservation.creneau.debut).toLocaleString("fr-FR")}
            </p>
            <p className="mt-1 font-semibold text-primaire-700">{formaterMontant(reservation.montantTotal, reservation.devise)}</p>

            {reservation.statut === "EN_ATTENTE" && (
              <div className="mt-3 flex gap-2">
                <Bouton taille="sm" chargement={chargementAction === reservation.id} onClick={() => gererReponse(reservation.id, true)}>
                  Confirmer
                </Bouton>
                <Bouton
                  taille="sm"
                  variante="destructif"
                  chargement={chargementAction === reservation.id}
                  onClick={() => gererReponse(reservation.id, false)}
                >
                  Refuser
                </Bouton>
              </div>
            )}

            {reservation.statut === "CONFIRMEE" && new Date(reservation.creneau.fin) < new Date() && (
              <div className="mt-3 flex gap-2">
                <Bouton taille="sm" chargement={chargementAction === reservation.id} onClick={() => gererCloture(reservation.id, "TERMINEE")}>
                  Marquer terminée
                </Bouton>
                <Bouton
                  taille="sm"
                  variante="destructif"
                  chargement={chargementAction === reservation.id}
                  onClick={() => gererCloture(reservation.id, "ABSENCE")}
                >
                  Marquer absence
                </Bouton>
              </div>
            )}
          </Carte>
        ))}
      </div>
    </div>
  );
}

export default function PageReservationsRecues() {
  return (
    <Suspense fallback={<p className="text-gray-500">Chargement...</p>}>
      <ContenuReservationsRecues />
    </Suspense>
  );
}
