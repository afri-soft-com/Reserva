"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MapPin, Star, Clock, ArrowLeft } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { CarteMap } from "../../../components/CarteMap";
import { Bouton } from "../../../components/Bouton";
import { Champ } from "../../../components/Champ";
import { NoteEtoiles } from "../../../components/NoteEtoiles";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { obtenirDetailService, listerAvisPrestataire } from "../../../lib/api-services";
import { creerReservation } from "../../../lib/api-reservations";
import { useAuthStore } from "../../../lib/store-auth";
import { LIBELLES_CATEGORIE, formaterMontant, Avis, type CategorieService } from "@reserva/shared";

interface CreneauAffiche {
  id: string;
  debut: string;
  fin: string;
  capaciteTotale: number;
  capaciteReservee: number;
  disponible: boolean;
}

export default function PageDetailService() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { estConnecte } = useAuthStore();

  const [service, setService] = useState<any>(null);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [creneauSelectionne, setCreneauSelectionne] = useState<CreneauAffiche | null>(null);
  const [chargement, setChargement] = useState(true);
  const [chargementReservation, setChargementReservation] = useState(false);
  const [notes, setNotes] = useState("");
  const [reservePourTiers, setReservePourTiers] = useState(false);
  const [nomTiers, setNomTiers] = useState("");
  const [telephoneTiers, setTelephoneTiers] = useState("");

  useEffect(() => {
    chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function chargerDonnees() {
    setChargement(true);
    try {
      const detail = await obtenirDetailService(params.id);
      setService(detail);
      const avisCharges = await listerAvisPrestataire(detail.prestataire.id);
      setAvis(avisCharges);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function gererReservation() {
    if (!estConnecte) {
      toastErreur("Connectez-vous pour effectuer une réservation.");
      router.push("/connexion");
      return;
    }
    if (!creneauSelectionne) {
      toastErreur("Veuillez sélectionner un créneau.");
      return;
    }
    if (reservePourTiers && (!nomTiers || !telephoneTiers)) {
      toastErreur("Indiquez le nom et le téléphone du bénéficiaire.");
      return;
    }

    setChargementReservation(true);
    try {
      const reservation = await creerReservation({
        serviceId: service.id,
        creneauId: creneauSelectionne.id,
        notes: notes || undefined,
        reservePourTiers,
        nomTiers: reservePourTiers ? nomTiers : undefined,
        telephoneTiers: reservePourTiers ? telephoneTiers : undefined,
      });
      toastSucces(`Réservation ${reservation.numero} créée ! En attente de confirmation.`);
      router.push(`/reservations/${reservation.id}`);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementReservation(false);
    }
  }

  if (chargement) return <p className="text-gray-500">Chargement...</p>;
  if (!service) return <p className="text-gray-500">Service non trouvé.</p>;

  const creneauxDisponibles: CreneauAffiche[] = service.creneaux.filter((c: CreneauAffiche) => c.disponible);

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primaire">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Carte>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primaire">
              {LIBELLES_CATEGORIE[service.prestataire.categorie as CategorieService]}
            </p>
            <h1 className="mb-1 text-2xl font-bold text-gray-900">{service.nom}</h1>
            <p className="mb-3 text-gray-600">{service.prestataire.nomEntreprise}</p>

            <div className="mb-3 flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {service.prestataire.ville}, {service.prestataire.quartier}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {(() => { const m = service.dureeMinutes; if (m >= 1440 && m % 1440 === 0) return `${m / 1440} j`; if (m >= 60 && m % 60 === 0) return `${m / 60} h`; return `${m} min`; })()}
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" /> {service.prestataire.noteMoyenne.toFixed(1)} ({service.prestataire.nombreAvis} avis)
              </span>
            </div>

            {service.description && <p className="text-gray-700">{service.description}</p>}
            {service.prestataire.description && (
              <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">{service.prestataire.description}</p>
            )}

            <p className="mt-4 text-xl font-bold text-primaire-700">{formaterMontant(service.prix, service.devise)}</p>
          </Carte>

          {service.prestataire.latitude != null && service.prestataire.longitude != null && (
            <Carte>
              <CarteMap
                latitude={service.prestataire.latitude}
                longitude={service.prestataire.longitude}
              />
            </Carte>
          )}

          <Carte>
            <h2 className="mb-3 font-bold text-gray-900">Avis clients</h2>
            {avis.length === 0 && <p className="text-sm text-gray-500">Aucun avis pour le moment.</p>}
            <div className="space-y-4">
              {avis.slice(0, 5).map((a) => (
                <div key={a.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="mb-1 flex items-center justify-between">
                    <NoteEtoiles note={a.note} taille={14} />
                    <span className="text-xs text-gray-400">{new Date(a.creeLe).toLocaleDateString("fr-FR")}</span>
                  </div>
                  {a.commentaire && <p className="text-sm text-gray-700">{a.commentaire}</p>}
                  {a.reponsePrestataire && (
                    <p className="mt-1 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                      <span className="font-semibold">Réponse du prestataire : </span>
                      {a.reponsePrestataire}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Carte>
        </div>

        <div>
          <Carte className="sticky top-20">
            <h2 className="mb-3 font-bold text-gray-900">Choisir un créneau</h2>

            {creneauxDisponibles.length === 0 && (
              <p className="text-sm text-gray-500">Aucun créneau disponible actuellement.</p>
            )}

            <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
              {creneauxDisponibles.map((creneau) => {
                const selectionne = creneauSelectionne?.id === creneau.id;
                return (
                  <button
                    key={creneau.id}
                    onClick={() => setCreneauSelectionne(creneau)}
                    className={`w-full rounded-champ border px-3 py-2 text-left text-sm transition-colors ${
                      selectionne ? "border-primaire bg-primaire-50 font-semibold text-primaire-700" : "border-gray-200 hover:border-primaire"
                    }`}
                  >
                    {new Date(creneau.debut).toLocaleString("fr-FR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <span className="ml-2 text-xs text-gray-400">
                      ({creneau.capaciteTotale - creneau.capaciteReservee} place(s) restante(s))
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={reservePourTiers} onChange={(e) => setReservePourTiers(e.target.checked)} />
              Réserver pour une autre personne
            </label>

            {reservePourTiers && (
              <div className="mb-3 space-y-2">
                <Champ placeholder="Nom du bénéficiaire" value={nomTiers} onChange={(e) => setNomTiers(e.target.value)} />
                <Champ placeholder="Téléphone du bénéficiaire" value={telephoneTiers} onChange={(e) => setTelephoneTiers(e.target.value)} />
              </div>
            )}

            <textarea
              placeholder="Notes ou instructions spéciales (optionnel)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mb-4 w-full rounded-champ border border-gray-300 p-3 text-sm focus:border-primaire focus:outline-none"
              rows={2}
            />

            <Bouton
              className="w-full"
              disabled={!creneauSelectionne}
              chargement={chargementReservation}
              onClick={gererReservation}
            >
              Réserver
            </Bouton>
          </Carte>
        </div>
      </div>
    </div>
  );
}
