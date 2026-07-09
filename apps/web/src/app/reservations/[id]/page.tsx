"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, MapPin, ArrowLeft, Smartphone, Receipt, Pen, Download } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { BadgeStatutReservation, BadgeStatutPaiement } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { NoteEtoiles } from "../../../components/NoteEtoiles";
import { Champ } from "../../../components/Champ";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { obtenirDetailReservation, annulerReservation, ReservationDetaillee } from "../../../lib/api-reservations";
import { initierPaiement, obtenirRecuHtml, telechargerRecuPdf } from "../../../lib/api-paiements";
import { creerAvis } from "../../../lib/api-avis";
import { formaterMontant, OPERATEUR_MOBILE_MONEY, LIBELLES_OPERATEUR, OperateurMobileMoney } from "@reserva/shared";

export default function PageDetailReservation() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [reservation, setReservation] = useState<ReservationDetaillee | null>(null);
  const [chargement, setChargement] = useState(true);
  const [afficherPaiement, setAfficherPaiement] = useState(false);
  const [operateur, setOperateur] = useState<OperateurMobileMoney>("MPESA");
  const [telephonePaiement, setTelephonePaiement] = useState("");
  const [chargementAction, setChargementAction] = useState(false);
  const [noteAvis, setNoteAvis] = useState(5);
  const [commentaireAvis, setCommentaireAvis] = useState("");

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function charger() {
    setChargement(true);
    try {
      const detail = await obtenirDetailReservation(params.id);
      setReservation(detail);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function gererPaiement() {
    if (!reservation) return;
    setChargementAction(true);
    try {
      const montantRestant = reservation.montantTotal - reservation.montantPaye;
      const resultat = await initierPaiement({
        reservationId: reservation.id,
        operateur,
        telephonePaiement: operateur !== "ESPECES" ? telephonePaiement : undefined,
        montant: montantRestant,
        acompteUniquement: false,
      });

      if (resultat.statutOperateur === "PAYE") {
        toastSucces("Paiement confirmé !");
      } else if (resultat.statutOperateur === "ECHOUE") {
        toastErreur(resultat.messageOperateur || "Le paiement a échoué. Réessayez.");
      } else {
        toastSucces("Paiement en attente de confirmation.");
      }
      setAfficherPaiement(false);
      await charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementAction(false);
    }
  }

  async function gererAnnulation() {
    if (!reservation) return;
    if (!confirm("Confirmez-vous l'annulation de cette réservation ?")) return;

    setChargementAction(true);
    try {
      const resultat = await annulerReservation({ reservationId: reservation.id });
      if (resultat.montantRembourse > 0) {
        toastSucces(`Réservation annulée. ${formaterMontant(resultat.montantRembourse, reservation.devise)} seront remboursés.`);
      } else {
        toastSucces("Réservation annulée.");
      }
      await charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementAction(false);
    }
  }

  async function gererVoirRecu() {
    if (!reservation) return;
    try {
      const html = await obtenirRecuHtml(reservation.id);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    }
  }

  async function gererEnvoiAvis() {
    if (!reservation) return;
    setChargementAction(true);
    try {
      await creerAvis({ reservationId: reservation.id, note: noteAvis, commentaire: commentaireAvis || undefined });
      toastSucces("Merci pour votre avis !");
      await charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementAction(false);
    }
  }

  if (chargement) return <p className="text-gray-500">Chargement...</p>;
  if (!reservation) return <p className="text-gray-500">Réservation non trouvée.</p>;

  const montantRestant = reservation.montantTotal - reservation.montantPaye;
  const peutAnnuler = ["EN_ATTENTE", "CONFIRMEE"].includes(reservation.statut);
  const peutPayer = montantRestant > 0 && !["ANNULEE", "REFUSEE"].includes(reservation.statut);
  const peutNoter = reservation.statut === "TERMINEE" && !reservation.avis;
  const peutModifier = ["EN_ATTENTE", "CONFIRMEE"].includes(reservation.statut);
  const peutVoirRecu = ["PAYE", "PARTIEL"].includes(reservation.statutPaiement);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primaire">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <Carte>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400">Réf. {reservation.numero}</p>
            <h1 className="text-xl font-bold text-gray-900">{reservation.service.nom}</h1>
            <p className="text-gray-600">{reservation.prestataire.nomEntreprise}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <BadgeStatutReservation statut={reservation.statut} />
            <BadgeStatutPaiement statut={reservation.statutPaiement} />
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-3 text-sm text-gray-600">
          <p className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> {new Date(reservation.creneau.debut).toLocaleString("fr-FR")}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {reservation.prestataire.ville}, {reservation.prestataire.quartier}
          </p>
          {reservation.reservePourTiers && (
            <p>Réservé pour : {reservation.nomTiers} ({reservation.telephoneTiers})</p>
          )}
          {reservation.notes && <p>Notes : {reservation.notes}</p>}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-gray-600">Montant total</span>
          <span className="font-bold text-primaire-700">{formaterMontant(reservation.montantTotal, reservation.devise)}</span>
        </div>
        {reservation.montantPaye > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Déjà payé</span>
            <span>{formaterMontant(reservation.montantPaye, reservation.devise)}</span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {peutPayer && (
            <Bouton onClick={() => setAfficherPaiement(true)}>
              <Smartphone className="h-4 w-4" /> Payer {formaterMontant(montantRestant, reservation.devise)}
            </Bouton>
          )}
          {peutModifier && (
            <Bouton variante="secondaire" onClick={() => router.push(`/reservations/${reservation.id}/modifier`)}>
              <Pen className="h-4 w-4" /> Modifier le créneau
            </Bouton>
          )}
          {peutVoirRecu && (
            <Bouton variante="fantome" onClick={gererVoirRecu}>
              <Receipt className="h-4 w-4" /> Voir le reçu
            </Bouton>
          )}
          {peutVoirRecu && (
            <Bouton variante="secondaire" onClick={() => telechargerRecuPdf(reservation!.id)}>
              <Download className="h-4 w-4" /> PDF
            </Bouton>
          )}
          {peutAnnuler && (
            <Bouton variante="destructif" chargement={chargementAction} onClick={gererAnnulation}>
              Annuler la réservation
            </Bouton>
          )}
        </div>
      </Carte>

      {afficherPaiement && (
        <Carte>
          <h2 className="mb-3 font-bold text-gray-900">Choisir un mode de paiement</h2>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {Object.values(OPERATEUR_MOBILE_MONEY).map((op) => (
              <button
                key={op}
                onClick={() => setOperateur(op)}
                className={`rounded-champ border px-3 py-2 text-sm font-medium ${
                  operateur === op ? "border-primaire bg-primaire-50 text-primaire-700" : "border-gray-200 text-gray-700"
                }`}
              >
                {LIBELLES_OPERATEUR[op]}
              </button>
            ))}
          </div>
          {operateur !== "ESPECES" && (
            <Champ
              libelle="Numéro de téléphone pour le paiement"
              placeholder="Ex: 0991234567"
              value={telephonePaiement}
              onChange={(e) => setTelephonePaiement(e.target.value)}
              className="mb-4"
            />
          )}
          <div className="flex gap-3">
            <Bouton chargement={chargementAction} onClick={gererPaiement}>
              Confirmer le paiement
            </Bouton>
            <Bouton variante="fantome" onClick={() => setAfficherPaiement(false)}>
              Annuler
            </Bouton>
          </div>
        </Carte>
      )}

      {peutNoter && (
        <Carte>
          <h2 className="mb-3 font-bold text-gray-900">Laisser un avis</h2>
          <div className="mb-3">
            <NoteEtoiles note={noteAvis} interactif taille={28} onChange={setNoteAvis} />
          </div>
          <textarea
            placeholder="Votre commentaire (optionnel)"
            value={commentaireAvis}
            onChange={(e) => setCommentaireAvis(e.target.value)}
            className="mb-4 w-full rounded-champ border border-gray-300 p-3 text-sm focus:border-primaire focus:outline-none"
            rows={3}
          />
          <Bouton chargement={chargementAction} onClick={gererEnvoiAvis}>
            Envoyer l&apos;avis
          </Bouton>
        </Carte>
      )}

      {reservation.avis && (
        <Carte>
          <h2 className="mb-2 font-bold text-gray-900">Votre avis</h2>
          <NoteEtoiles note={reservation.avis.note} />
        </Carte>
      )}
    </div>
  );
}
