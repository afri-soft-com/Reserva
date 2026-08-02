"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, TrendingUp, XCircle, Users, Award } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { obtenirStatistiquesPrestataire, StatistiquesPrestataire } from "../../../lib/api-prestataires";
import { formaterMontant } from "@reserva/shared";

const LIBELLES_STATUT: Record<string, string> = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmées",
  REFUSEE: "Refusées",
  ANNULEE: "Annulées",
  TERMINEE: "Terminées",
  ABSENCE: "Absences",
};

export default function PageStatistiquesPrestataire() {
  const [donnees, setDonnees] = useState<StatistiquesPrestataire | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await obtenirStatistiquesPrestataire();
      setDonnees(resultat);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  if (chargement) return <p className="text-gray-500">Chargement...</p>;
  if (!donnees) return <p className="text-gray-500">Aucune donnée disponible.</p>;

  const maxJour = Math.max(1, ...donnees.parJour.map((j) => j.reservations));
  const maxStatut = Math.max(1, ...donnees.parStatut.map((s) => s._count));
  const maxService = Math.max(1, ...donnees.parService.map((s) => s.reservations));
  const maxNote = Math.max(1, ...donnees.repartitionNotes.map((n) => n.nombre));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <p className="text-sm text-gray-500">Vue détaillée de votre activité sur les 30 derniers jours</p>
        </div>
        <Link href="/prestataire/calendrier" className="text-sm font-semibold text-primaire hover:underline">
          Voir le calendrier →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Carte>
          <p className="flex items-center gap-1 text-sm text-gray-500">
            <Users className="h-4 w-4" /> Réservations totales
          </p>
          <p className="text-2xl font-bold text-primaire-700">{donnees.totalReservations}</p>
        </Carte>
        <Carte>
          <p className="flex items-center gap-1 text-sm text-gray-500">
            <XCircle className="h-4 w-4" /> Taux d&apos;annulation
          </p>
          <p className="text-2xl font-bold text-red-600">{donnees.tauxAnnulation}%</p>
        </Carte>
        <Carte>
          <p className="flex items-center gap-1 text-sm text-gray-500">
            <Star className="h-4 w-4 fill-accent text-accent" /> Note moyenne
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {donnees.noteMoyenne.toFixed(1)}{" "}
            <span className="text-sm font-normal text-gray-500">({donnees.nombreAvis} avis)</span>
          </p>
        </Carte>
        <Carte>
          <p className="flex items-center gap-1 text-sm text-gray-500">
            <Award className="h-4 w-4" /> Meilleur service (mois)
          </p>
          <p className="text-2xl font-bold text-gray-900">{donnees.parService[0]?.nom ?? "—"}</p>
        </Carte>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Carte>
          <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
            <TrendingUp className="h-4 w-4 text-primaire" /> Activité — 30 derniers jours
          </h2>
          <div className="flex h-32 items-end gap-0.5">
            {donnees.parJour.map((j) => (
              <div key={j.date} className="flex flex-1 flex-col items-center gap-1" title={`${j.date} : ${j.reservations} résa(s)`}>
                <span className="text-[9px] font-semibold text-primaire-700">{j.reservations > 0 ? j.reservations : ""}</span>
                <div
                  className="w-full rounded-t bg-primaire-200 hover:bg-primaire"
                  style={{ height: `${Math.round((j.reservations / maxJour) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </Carte>

        <Carte>
          <h2 className="mb-3 font-bold text-gray-900">Répartition par statut</h2>
          <div className="space-y-2">
            {donnees.parStatut.map((s) => (
              <div key={s.statut}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gray-600">{LIBELLES_STATUT[s.statut] ?? s.statut}</span>
                  <span className="font-semibold text-gray-900">{s._count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-primaire"
                    style={{ width: `${Math.round((s._count / maxStatut) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Carte>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Carte>
          <h2 className="mb-3 font-bold text-gray-900">Réservations par service (mois en cours)</h2>
          <div className="space-y-3">
            {donnees.parService.length === 0 && <p className="text-sm text-gray-500">Aucune réservation ce mois-ci.</p>}
            {donnees.parService.map((s) => (
              <div key={s.serviceId}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-gray-900">{s.nom}</span>
                  <span className="shrink-0 text-gray-500">
                    {s.reservations} · <strong className="text-primaire-700">{formaterMontant(s.revenus, "CDF")}</strong>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.round((s.reservations / maxService) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Carte>

        <Carte>
          <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
            <Star className="h-4 w-4 fill-accent text-accent" /> Distribution des notes
          </h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((note) => {
              const repartition = donnees.repartitionNotes.find((n) => n.note === note);
              const nombre = repartition?.nombre ?? 0;
              return (
                <div key={note} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-semibold text-gray-600">{note}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((nombre / maxNote) * 100)}%` }} />
                  </div>
                  <span className="w-6 text-right text-sm text-gray-500">{nombre}</span>
                </div>
              );
            })}
          </div>
        </Carte>
      </div>

      <Carte>
        <h2 className="mb-3 font-bold text-gray-900">Meilleurs clients</h2>
        {donnees.topClients.length === 0 && <p className="text-sm text-gray-500">Aucun client pour le moment.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <th className="py-2 pr-4">Client</th>
                <th className="py-2 pr-4">Téléphone</th>
                <th className="py-2 pr-4">Réservations</th>
                <th className="py-2">Total dépensé</th>
              </tr>
            </thead>
            <tbody>
              {donnees.topClients.map((c, index) => (
                <tr key={c.clientId} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 font-medium text-gray-900">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primaire-50 text-xs font-bold text-primaire-700">
                      {index + 1}
                    </span>
                    {c.nom}
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{c.telephone}</td>
                  <td className="py-2 pr-4 text-gray-500">{c.reservations}</td>
                  <td className="py-2 font-semibold text-primaire-700">{formaterMontant(c.totalDepense, "CDF")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Carte>
    </div>
  );
}
