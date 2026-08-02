"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarX, Plus, Trash2 } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { Champ } from "../../../components/Champ";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import {
  listerMesServices,
  listerMesPeriodesIndisponibles,
  creerPeriodeIndisponible,
  supprimerPeriodeIndisponible,
  PeriodeIndisponible,
} from "../../../lib/api-prestataires";
import { ServiceOffert } from "@reserva/shared";

export default function PageIndisponibilites() {
  const [periodes, setPeriodes] = useState<PeriodeIndisponible[]>([]);
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [chargement, setChargement] = useState(true);
  const [chargementAction, setChargementAction] = useState(false);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);

  const [serviceId, setServiceId] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [motif, setMotif] = useState("");

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    try {
      const [periodesResult, servicesResult] = await Promise.all([
        listerMesPeriodesIndisponibles(),
        listerMesServices(),
      ]);
      setPeriodes(periodesResult);
      setServices(servicesResult);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  function versDateISO(dateStr: string, finJour = false): string {
    const d = new Date(`${dateStr}T00:00:00`);
    if (finJour) d.setDate(d.getDate() + 1);
    return d.toISOString();
  }

  async function gererCreation(e: React.FormEvent) {
    e.preventDefault();
    if (!dateDebut || !dateFin) {
      toastErreur("Veuillez choisir les dates de début et de fin");
      return;
    }
    if (new Date(dateDebut) > new Date(dateFin)) {
      toastErreur("La date de fin doit être postérieure à la date de début");
      return;
    }
    setChargementAction(true);
    try {
      await creerPeriodeIndisponible({
        serviceId: serviceId || undefined,
        dateDebut: versDateISO(dateDebut),
        dateFin: versDateISO(dateFin, true),
        motif: motif || undefined,
      });
      toastSucces("Période bloquée avec succès !");
      setAfficherFormulaire(false);
      setServiceId("");
      setDateDebut("");
      setDateFin("");
      setMotif("");
      await charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementAction(false);
    }
  }

  async function gererSuppression(id: string) {
    try {
      await supprimerPeriodeIndisponible(id);
      toastSucces("Blocage levé, ces créneaux sont à nouveau réservables");
      await charger();
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    }
  }

  function formaterPeriode(p: PeriodeIndisponible): string {
    const debut = new Date(p.dateDebut);
    const fin = new Date(p.dateFin);
    const unJour = 86400000;
    const memesJours = fin.getTime() - debut.getTime() === unJour;
    if (memesJours) {
      return `Journée du ${debut.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
    }
    return `Du ${debut.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${fin.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jours bloqués</h1>
          <p className="text-sm text-gray-500">Bloquez des dates où vous ne pouvez pas recevoir de réservations</p>
        </div>
        <div className="flex gap-2">
          <Link href="/prestataire/calendrier" className="text-sm font-semibold text-primaire hover:underline">
            Voir le calendrier
          </Link>
          {!afficherFormulaire && (
            <Bouton onClick={() => setAfficherFormulaire(true)}>
              <Plus className="h-4 w-4" /> Bloquer une période
            </Bouton>
          )}
        </div>
      </div>

      {afficherFormulaire && (
        <Carte>
          <h2 className="mb-4 font-bold text-gray-900">Bloquer une période</h2>
          <form onSubmit={gererCreation} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Service concerné (tous les services si vide)
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="h-[52px] w-full rounded-champ border border-gray-300 bg-gray-50 px-4 text-base text-gray-900 focus:border-primaire focus:outline-none focus:ring-2 focus:ring-primaire/20"
              >
                <option value="">Tous les services</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Champ
                type="date"
                libelle="Date de début"
                required
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
              <Champ
                type="date"
                libelle="Date de fin"
                required
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>
            <Champ
              libelle="Motif (optionnel)"
              placeholder="Ex : congés, maintenance, événement privé..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
            <div className="flex gap-2">
              <Bouton type="submit" chargement={chargementAction}>
                Confirmer le blocage
              </Bouton>
              <Bouton type="button" variante="fantome" onClick={() => setAfficherFormulaire(false)}>
                Annuler
              </Bouton>
            </div>
          </form>
        </Carte>
      )}

      {chargement && <p className="text-gray-500">Chargement...</p>}
      {!chargement && periodes.length === 0 && (
        <Carte>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CalendarX className="h-10 w-10 text-gray-300" />
            <p className="font-semibold text-gray-900">Aucune période bloquée</p>
            <p className="text-sm text-gray-500">
              Utilisez le bouton « Bloquer une période » pour marquer des dates comme indisponibles.
            </p>
          </div>
        </Carte>
      )}

      {!chargement && periodes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {periodes.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-card border border-red-200 bg-red-50 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-red-900">
                    <CalendarX className="mr-1 inline h-4 w-4" />
                    {formaterPeriode(p)}
                  </p>
                  <p className="text-sm text-red-700">
                    {p.service ? `Service : ${p.service.nom}` : "Tous les services"}
                  </p>
                  {p.motif && <p className="mt-1 text-xs text-red-600">Motif : {p.motif}</p>}
                </div>
                <button
                  onClick={() => gererSuppression(p.id)}
                  className="rounded-full p-2 text-red-500 transition hover:bg-red-100"
                  aria-label="Supprimer cette période"
                  title="Lever le blocage"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
