"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { BadgeStatutReservation } from "../../../components/Carte";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { obtenirCalendrier, ReponseCalendrier, CreneauCalendrier } from "../../../lib/api-prestataires";
import { formaterMontant } from "@reserva/shared";
import clsx from "clsx";

const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function construireJours(annee: number, mois: number): (number | null)[] {
  const offset = (new Date(annee, mois, 1).getDay() + 6) % 7;
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const jours: (number | null)[] = Array(offset).fill(null);
  for (let i = 1; i <= nbJours; i++) jours.push(i);
  return jours;
}

export default function PageCalendrierPrestataire() {
  const aujourdhui = new Date();
  const [mois, setMois] = useState(`${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, "0")}`);
  const [donnees, setDonnees] = useState<ReponseCalendrier | null>(null);
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mois]);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await obtenirCalendrier(mois);
      setDonnees(resultat);
      setJourSelectionne(null);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  function naviguer(decalage: number) {
    const [annee, moisNum] = mois.split("-").map(Number);
    const d = new Date(annee, moisNum - 1 + decalage, 1);
    setMois(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const [annee, moisNum] = mois.split("-").map(Number);
  const cellules = construireJours(annee, moisNum);
  const libelleMois = new Date(annee, moisNum, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const creneauxSelectionnes = jourSelectionne ? donnees?.jours[jourSelectionne] ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
          <p className="text-sm text-gray-500">Vos créneaux et réservations mois par mois</p>
        </div>
        <Link href="/prestataire/services" className="text-sm font-semibold text-primaire hover:underline">
          Gérer mes services →
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => naviguer(-1)}
            className="rounded-full border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="min-w-36 text-center text-lg font-bold capitalize text-gray-900">{libelleMois}</p>
          <button
            onClick={() => naviguer(1)}
            className="rounded-full border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-gray-600">
            <strong className="text-gray-900">{donnees?.totalCreneaux ?? 0}</strong> créneaux
          </span>
          <span className="text-gray-600">
            <strong className="text-gray-900">{donnees?.totalReservations ?? 0}</strong> réservations
          </span>
        </div>
      </div>

      {chargement && <p className="text-gray-500">Chargement...</p>}
      {!chargement && donnees && (
        <>
          <div className="grid grid-cols-7 gap-1 rounded-card bg-white p-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            {JOURS_SEMAINE.map((j) => (
              <div key={j} className="pb-1 text-center text-xs font-semibold text-gray-400">
                {j}
              </div>
            ))}
            {cellules.map((jour, index) => {
              if (jour === null) return <div key={`vide-${index}`} className="min-h-20 rounded-lg bg-gray-50" />;
              const cle = `${mois}-${String(jour).padStart(2, "0")}`;
              const creneauxDuJour = donnees.jours[cle] ?? [];
              const reserve = creneauxDuJour.reduce((s, c) => s + c.reservations.length, 0);
              const aujourdhuiCle = `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, "0")}-${String(aujourdhui.getDate()).padStart(2, "0")}`;
              return (
                <button
                  key={cle}
                  onClick={() => setJourSelectionne(cle)}
                  className={clsx(
                    "min-h-20 rounded-lg p-1.5 text-left align-top transition",
                    creneauxDuJour.length === 0 ? "bg-gray-50 text-gray-400" : "bg-primaire-50 text-gray-900 hover:bg-primaire-100",
                    jourSelectionne === cle && "ring-2 ring-primaire",
                    aujourdhuiCle === cle && "font-bold"
                  )}
                >
                  <span className="text-sm font-semibold">{jour}</span>
                  <div className="mt-1 space-y-0.5">
                    {creneauxDuJour.slice(0, 3).map((c) => (
                      <div key={c.id} className="flex items-center gap-1 rounded bg-white/70 px-1 text-[10px]">
                        <span className="truncate font-medium">{new Date(c.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        {c.reservations.length > 0 && (
                          <span className="flex items-center gap-0.5 text-primaire-700">
                            <Users className="h-2.5 w-2.5" />
                            {c.reservations.length}/{c.capaciteTotale}
                          </span>
                        )}
                      </div>
                    ))}
                    {creneauxDuJour.length > 3 && <p className="px-1 text-[10px] text-primaire-700">+{creneauxDuJour.length - 3} créneaux</p>}
                  </div>
                  {reserve > 0 && (
                    <span className="mt-1 inline-block rounded-full bg-primaire px-1.5 text-[10px] font-bold text-white">{reserve} résa</span>
                  )}
                </button>
              );
            })}
          </div>

          <Carte>
            <h2 className="mb-3 font-bold text-gray-900">
              {jourSelectionne
                ? `Détails du ${new Date(`${jourSelectionne}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`
                : "Sélectionnez un jour pour voir le détail"}
            </h2>
            {jourSelectionne && creneauxSelectionnes.length === 0 && (
              <p className="text-sm text-gray-500">Aucun créneau ce jour.</p>
            )}
            <div className="space-y-4">
              {creneauxSelectionnes.map((creneau: CreneauCalendrier) => (
                <div key={creneau.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{creneau.service.nom}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(creneau.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {new Date(creneau.fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                        {formaterMontant(creneau.service.prix, creneau.service.devise)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Places : {creneau.capaciteReservee}/{creneau.capaciteTotale}
                      </p>
                    </div>
                  </div>
                  {creneau.reservations.length === 0 && <p className="mt-1 text-xs text-gray-400">Aucune réservation sur ce créneau.</p>}
                  <div className="mt-2 space-y-1.5">
                    {creneau.reservations.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.client.nom}</p>
                          <p className="text-xs text-gray-400">
                            {r.client.telephone} · Réf. {r.numero}
                          </p>
                        </div>
                        <BadgeStatutReservation statut={r.statut as any} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Carte>
        </>
      )}
    </div>
  );
}
