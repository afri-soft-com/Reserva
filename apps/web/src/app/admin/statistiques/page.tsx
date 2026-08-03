"use client";

import { useEffect, useState } from "react";
import { Users, Building2, CalendarCheck, DollarSign, TrendingUp, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastSucces, toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { obtenirStatistiquesAdmin, telechargerStatistiquesAdminPdf } from "../../../lib/api-paiements";
import { useAuthStore } from "../../../lib/store-auth";
import { formaterMontant } from "@reserva/shared";

interface EvolutionData {
  mois: string;
  revenus: number;
  reservations: number;
  reservationsPayees: number;
}

interface StatistiquesAdmin {
  periode: string;
  utilisateurs: { total: number; nouveauxCeMois: number };
  prestataires: { total: number; enAttente: number; approuves: number };
  reservations: { total: number; cetteSemaine: number; ceMois: number; parStatut: Record<string, number> };
  revenus: { ceMois: number };
  evolution: EvolutionData[];
}

interface FiltresAdmin {
  periode: string;
  ville: string;
  categorie: string;
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
const CATEGORIES = ["HOTELLERIE", "RESTAURATION", "SANTE", "TRANSPORT"];
const VILLES = ["Kinshasa", "Lubumbashi"];

export default function PageAdminStatistiques() {
  const { utilisateur } = useAuthStore();
  const [stats, setStats] = useState<StatistiquesAdmin | null>(null);
  const [chargement, setChargement] = useState(true);
  const [chargementExport, setChargementExport] = useState(false);
  const [filtres, setFiltres] = useState<FiltresAdmin>({ periode: "mois", ville: "", categorie: "" });

  useEffect(() => {
    chargerStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres]);

  async function chargerStats() {
    setChargement(true);
    try {
      const resultat = await obtenirStatistiquesAdmin({
        periode: filtres.periode || undefined,
        ville: filtres.ville || undefined,
        categorie: filtres.categorie || undefined,
      });
      setStats(resultat);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function exporterPdf() {
    setChargementExport(true);
    try {
      await telechargerStatistiquesAdminPdf({
        periode: filtres.periode || undefined,
        ville: filtres.ville || undefined,
        categorie: filtres.categorie || undefined,
      });
      toastSucces("Rapport PDF téléchargé.");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargementExport(false);
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

  const classeSelect = "h-[46px] rounded-champ border border-gray-300 bg-gray-50 px-4 text-base text-gray-900 focus:border-primaire focus:outline-none focus:ring-2 focus:ring-primaire/20";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Période</label>
          <select className={classeSelect} value={filtres.periode} onChange={(e) => setFiltres({ ...filtres, periode: e.target.value })}>
            <option value="mois">Ce mois-ci</option>
            <option value="trimestre">90 derniers jours</option>
            <option value="annee">Cette année</option>
            <option value="tout">Toute la période</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Catégorie</label>
          <select className={classeSelect} value={filtres.categorie} onChange={(e) => setFiltres({ ...filtres, categorie: e.target.value })}>
            <option value="">Toutes</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Ville</label>
          <select className={classeSelect} value={filtres.ville} onChange={(e) => setFiltres({ ...filtres, ville: e.target.value })}>
            <option value="">Toutes</option>
            {VILLES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <Bouton variante="primaire" onClick={exporterPdf} chargement={chargementExport}>
          <Download className="h-4 w-4" /> Rapport PDF
        </Bouton>
      </div>

      <p className="text-sm text-gray-500">Période affichée : {stats.periode}</p>

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
