"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Check } from "lucide-react";
import { Carte } from "../../../../components/Carte";
import { Bouton } from "../../../../components/Bouton";
import { toastSucces, toastErreur } from "../../../../components/Toast";
import { extraireMessageErreur } from "../../../../lib/api-client";
import { obtenirDetailReservation, modifierReservation, ReservationDetaillee } from "../../../../lib/api-reservations";
import { obtenirDetailService } from "../../../../lib/api-services";

export default function PageModifierReservation() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [reservation, setReservation] = useState<ReservationDetaillee | null>(null);
  const [creneauxDisponibles, setCreneauxDisponibles] = useState<
    { id: string; debut: string; fin: string; capaciteTotale: number; capaciteReservee: number; disponible: boolean }[]
  >([]);
  const [creneauSelectionne, setCreneauSelectionne] = useState<string | null>(null);
  const [chargementInitial, setChargementInitial] = useState(true);
  const [chargementAction, setChargementAction] = useState(false);

  useEffect(() => {
    chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function chargerDonnees() {
    setChargementInitial(true);
    try {
      const detail = await obtenirDetailReservation(params.id);
      setReservation(detail);

      const service = await obtenirDetailService(detail.serviceId);
      setCreneauxDisponibles(service.creneaux.filter((c) => c.id !== detail.creneauId && c.disponible));
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementInitial(false);
    }
  }

  async function gererModification() {
    if (!creneauSelectionne || !reservation) return;
    setChargementAction(true);
    try {
      const modifiee = await modifierReservation({ reservationId: reservation.id, nouveauCreneauId: creneauSelectionne });
      toastSucces("Créneau modifié avec succès !");
      router.push(`/reservations/${modifiee.id}`);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementAction(false);
    }
  }

  if (chargementInitial) return <p className="text-gray-500">Chargement...</p>;
  if (!reservation) return <p className="text-gray-500">Réservation non trouvée.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primaire">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <Carte>
        <h1 className="text-xl font-bold text-gray-900">Modifier le créneau</h1>
        <p className="mt-1 text-sm text-gray-500">{reservation.service.nom} — {reservation.prestataire.nomEntreprise}</p>
      </Carte>

      <Carte>
        <h2 className="mb-2 font-bold text-gray-900">Créneau actuel</h2>
        <p className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          {new Date(reservation.creneau.debut).toLocaleString("fr-FR")}
        </p>
      </Carte>

      <Carte>
        <h2 className="mb-3 font-bold text-gray-900">Choisir un nouveau créneau</h2>
        {creneauxDisponibles.length === 0 ? (
          <p className="text-gray-500">Aucun autre créneau disponible pour ce service.</p>
        ) : (
          <div className="space-y-2">
            {creneauxDisponibles.map((creneau) => (
              <button
                key={creneau.id}
                onClick={() => setCreneauSelectionne(creneau.id)}
                className={`flex w-full items-center justify-between rounded-champ border px-4 py-3 text-left transition-colors ${
                  creneauSelectionne === creneau.id
                    ? "border-primaire bg-primaire-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(creneau.debut).toLocaleString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(creneau.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    {" — "}
                    {new Date(creneau.fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {creneauSelectionne === creneau.id && <Check className="h-5 w-5 text-primaire" />}
              </button>
            ))}
          </div>
        )}
      </Carte>

      <Bouton
        className="w-full"
        chargement={chargementAction}
        disabled={!creneauSelectionne}
        onClick={gererModification}
      >
        Confirmer la modification
      </Bouton>
    </div>
  );
}
