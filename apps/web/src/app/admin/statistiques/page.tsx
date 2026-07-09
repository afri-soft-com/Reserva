"use client";

import { useEffect, useState } from "react";
import { Users, Building2, CalendarCheck, DollarSign, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Carte } from "../../../components/Carte";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { obtenirStatistiquesAdmin } from "../../../lib/api-paiements";
import { useAuthStore } from "../../../lib/store-auth";
import { formaterMontant } from "@reserva/shared";

interface EvolutionData {
  mois: string;
  revenus: number;
  reservations: number;
  reservationsPayees: number;
}

interface StatistiquesAdmin {
  utilisateurs: { total: number; nouveauxCeMois: number };
  prestataires: { total: number; enAttente: number; approuves: number };
  reservations: { total: number; cetteSemaine: number; ceMois: number; parStatut: Record<string, number> };
  revenus: { ceMois: number };
  evolution: EvolutionData[];
}

const COULEURS_STATUT = ["#F5A623", "#10B981", "#DC2626", "#6B7280", "#1A56DB", "#DC2626"];
const LIBELLES_STATUT_RESERVATION: Record<string, string> = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmée",
  REFUSEE: "Refusée",
  ANNULEE: "Annulée",
  TERMINEE: "Terminée",
  ABSENCE: "Absence",
};

export default function PageAdminStatistiques() {
  const { utilisateur } = useAuthStore();
  const [stats, setStats] = useState<StatistiquesAdmin | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    chargerStats();
  }, []);

  async function chargerStats() {
    setChargement(true);
    try {
      const resultat = await obtenirStatistiquesAdmin();
      setStats(resultat);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  if (utilisateur?.role !== "ADMIN") {
    return (
      <Carte>
        <p className="text-center text-gray-500">Accès non autorisé.</p>
      </Carte>
    );
  }

  if (chargement) return <p className="text-gray-500">Chargement...</p>;
  if (!stats) return <p className="text-gray-500">Impossible de charger les statistiques.</p>;

  const donneesDonut = Object.entries(stats.reservations.parStatut).map(([statut, nombre], i) => ({
    name: LIBELLES_STATUT_RESERVATION[statut] || statut,
    value: nombre,
    color: COULEURS_STATUT[i % COULEURS_STATUT.length],
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Carte>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primaire-50">
              <Users className="h-6 w-6 text-primaire" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.utilisateurs.total}</p>
              <p className="text-sm text-gray-500">Utilisateurs</p>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
            <TrendingUp className="h-3 w-3" /> +{stats.utilisateurs.nouveauxCeMois} ce mois
          </p>
        </Carte>

        <Carte>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primaire-50">
              <Building2 className="h-6 w-6 text-primaire" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.prestataires.total}</p>
              <p className="text-sm text-gray-500">Prestataires</p>
            </div>
          </div>
          <div className="mt-2 flex gap-3 text-xs">
            <span className="text-emerald-600">{stats.prestataires.approuves} approuvés</span>
            <span className="text-amber-600">{stats.prestataires.enAttente} en attente</span>
          </div>
        </Carte>

        <Carte>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primaire-50">
              <CalendarCheck className="h-6 w-6 text-primaire" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.reservations.total}</p>
              <p className="text-sm text-gray-500">Réservations</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {stats.reservations.cetteSemaine} cette semaine · {stats.reservations.ceMois} ce mois
          </p>
        </Carte>

        <Carte>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primaire-50">
              <DollarSign className="h-6 w-6 text-primaire" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formaterMontant(stats.revenus.ceMois, "CDF")}</p>
              <p className="text-sm text-gray-500">Revenus ce mois</p>
            </div>
          </div>
        </Carte>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Carte>
          <h2 className="mb-4 font-bold text-gray-900">Évolution mensuelle</h2>
          {stats.evolution && stats.evolution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.evolution}>
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="reservations" name="Réservations" fill="#1A56DB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenus" name="Revenus" fill="#F5A623" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400">Aucune donnée d'évolution disponible.</p>
          )}
        </Carte>

        <Carte>
          <h2 className="mb-4 font-bold text-gray-900">Réservations par statut</h2>
          <div className="flex flex-col items-center">
            {donneesDonut.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={donneesDonut} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {donneesDonut.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400">Aucune réservation.</p>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {donneesDonut.map((d, i) => (
                <div key={i} className="flex items-center gap-1 text-xs text-gray-600">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}: {d.value}
                </div>
              ))}
            </div>
          </div>
        </Carte>
      </div>
    </div>
  );
}
