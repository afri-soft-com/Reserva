"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  DollarSign,
  Package,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Carte } from "../../../components/Carte";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { obtenirPilotageAdmin, obtenirStatistiquesAdmin } from "../../../lib/api-admin";
import { formaterMontant } from "@reserva/shared";

const COULEURS = ["#F5A623", "#10B981", "#DC2626", "#6B7280", "#1A56DB", "#8B5CF6"];

export default function PageAdminPilotage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof obtenirPilotageAdmin>> | null>(null);
  const [evolution, setEvolution] = useState<{ mois: string; revenus: number; reservations: number }[]>([]);
  const [parStatut, setParStatut] = useState<Record<string, number>>({});
  const [periode, setPeriode] = useState("mois");
  const [moisActif, setMoisActif] = useState<string | null>(null);
  const [statutActif, setStatutActif] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    Promise.all([
      obtenirPilotageAdmin(),
      obtenirStatistiquesAdmin({ periode }).catch(() => null),
    ])
      .then(([pilotage, stats]) => {
        setData(pilotage);
        if (stats?.evolution) setEvolution(stats.evolution);
        if (stats?.reservations?.parStatut) setParStatut(stats.reservations.parStatut);
      })
      .catch((e) => toastErreur(extraireMessageErreur(e)))
      .finally(() => setChargement(false));
  }, [periode]);

  const donut = useMemo(
    () =>
      Object.entries(parStatut).map(([name, value], i) => ({
        name,
        value,
        color: COULEURS[i % COULEURS.length],
      })),
    [parStatut]
  );

  if (chargement) return <p className="text-gray-500">Chargement du pilotage…</p>;
  if (!data) return <p className="text-gray-500">Impossible de charger le pilotage.</p>;

  const { stats, alertes, files } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vue d&apos;ensemble</h1>
          <p className="text-sm text-gray-500">
            Console interactive — cliquez les indicateurs et graphiques pour explorer.
          </p>
        </div>
        <select
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
        >
          <option value="mois">Ce mois</option>
          <option value="trimestre">90 jours</option>
          <option value="annee">Cette année</option>
          <option value="tout">Tout</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/prestataires" className="block transition hover:scale-[1.01]">
          <Carte>
            <p className="flex items-center gap-1 text-sm text-gray-500"><Building2 className="h-4 w-4" /> Prestataires</p>
            <p className="text-2xl font-bold">{stats.prestataires.total}</p>
            <p className="text-xs text-amber-600">{stats.prestataires.enAttente} en attente</p>
          </Carte>
        </Link>
        <Link href="/admin/reservations" className="block transition hover:scale-[1.01]">
          <Carte>
            <p className="flex items-center gap-1 text-sm text-gray-500"><CalendarCheck className="h-4 w-4" /> Réservations</p>
            <p className="text-2xl font-bold">{stats.reservations.total}</p>
            <p className="text-xs text-gray-500">{stats.reservations.ceMois} ce mois</p>
          </Carte>
        </Link>
        <Link href="/admin/finances" className="block transition hover:scale-[1.01]">
          <Carte>
            <p className="flex items-center gap-1 text-sm text-gray-500"><DollarSign className="h-4 w-4" /> GMV période</p>
            <p className="text-2xl font-bold text-primaire">{formaterMontant(stats.revenus?.gmv ?? stats.revenus?.ceMois ?? 0, "CDF")}</p>
            <p className="text-xs text-gray-500">
              Plateforme {formaterMontant(stats.revenus?.plateforme ?? 0, "CDF")}
            </p>
          </Carte>
        </Link>
        <Link href="/admin/documents-kyc" className="block transition hover:scale-[1.01]">
          <Carte>
            <p className="flex items-center gap-1 text-sm text-gray-500"><AlertTriangle className="h-4 w-4" /> Alertes actives</p>
            <p className="text-2xl font-bold text-amber-600">
              {alertes.prestatairesEnAttente + alertes.versementsEnAttente + alertes.abonnementsExpirant}
            </p>
            <p className="text-xs text-gray-500">{alertes.paiementsEnAttente} paiements en attente</p>
          </Carte>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Carte>
          <h2 className="mb-3 font-semibold text-gray-900">
            Évolution {moisActif ? `— ${moisActif}` : "(cliquer une barre)"}
          </h2>
          {evolution.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={evolution}>
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="reservations"
                  name="Réservations"
                  fill="#1A56DB"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(d: any) => setMoisActif(d?.mois ?? null)}
                />
                <Bar
                  dataKey="revenus"
                  name="Revenus"
                  fill="#F5A623"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(d: any) => setMoisActif(d?.mois ?? null)}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400">Pas encore de série temporelle.</p>
          )}
          {moisActif && (
            <p className="mt-2 text-xs text-gray-600">
              Mois sélectionné : <strong>{moisActif}</strong> —{" "}
              {evolution.find((e) => e.mois === moisActif)?.reservations ?? 0} résa ·{" "}
              {formaterMontant(evolution.find((e) => e.mois === moisActif)?.revenus ?? 0, "CDF")}
            </p>
          )}
        </Carte>

        <Carte>
          <h2 className="mb-3 font-semibold text-gray-900">
            Statuts {statutActif ? `— ${statutActif}` : "(cliquer un segment)"}
          </h2>
          {donut.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={80}
                  onClick={(_, index) => setStatutActif(donut[index]?.name ?? null)}
                  cursor="pointer"
                >
                  {donut.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      stroke={statutActif === entry.name ? "#111827" : undefined}
                      strokeWidth={statutActif === entry.name ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400">Aucune répartition.</p>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {donut.map((d) => (
              <button
                key={d.name}
                type="button"
                onClick={() => setStatutActif(d.name)}
                className={`flex items-center gap-1 text-xs ${statutActif === d.name ? "font-bold text-gray-900" : "text-gray-600"}`}
              >
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}: {d.value}
              </button>
            ))}
          </div>
        </Carte>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/prestataires" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm hover:bg-amber-100">
          <span className="font-semibold text-amber-800">{alertes.prestatairesEnAttente}</span> validations prestataire
        </Link>
        <Link href="/admin/versements" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm hover:bg-emerald-100">
          <span className="font-semibold text-emerald-800">{alertes.versementsEnAttente}</span> versements à traiter
        </Link>
        <Link href="/admin/abonnements" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm hover:bg-blue-100">
          <span className="font-semibold text-blue-800">{alertes.abonnementsExpirant}</span> abonnements &lt; 14 j
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Carte>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Prestataires à valider</h2>
            <Link href="/admin/prestataires" className="text-xs text-primaire">Voir tout</Link>
          </div>
          <ul className="space-y-2 text-sm">
            {files.prestatairesEnAttente.length === 0 && (
              <li className="text-gray-500">Aucune demande en attente.</li>
            )}
            {files.prestatairesEnAttente.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 border-b border-gray-50 pb-2">
                <span>
                  <span className="font-medium">{p.nomEntreprise}</span>
                  <span className="text-gray-500"> · {p.ville} · {p.categorie}</span>
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(p.creeLe).toLocaleDateString("fr-FR")}
                </span>
              </li>
            ))}
          </ul>
        </Carte>

        <Carte>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1 font-semibold text-gray-900">
              <Wallet className="h-4 w-4" /> Versements en attente
            </h2>
            <Link href="/admin/versements" className="text-xs text-primaire">Traiter</Link>
          </div>
          <ul className="space-y-2 text-sm">
            {files.versementsEnAttente.length === 0 && (
              <li className="text-gray-500">Aucun versement en attente.</li>
            )}
            {files.versementsEnAttente.map((v) => (
              <li key={v.id} className="flex justify-between gap-2 border-b border-gray-50 pb-2">
                <span className="font-medium">{v.prestataire?.nomEntreprise}</span>
                <span className="font-semibold">{formaterMontant(v.montant, v.devise)}</span>
              </li>
            ))}
          </ul>
        </Carte>

        <Carte>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Dernières réservations</h2>
            <Link href="/admin/reservations" className="text-xs text-primaire">Journal</Link>
          </div>
          <ul className="space-y-2 text-sm">
            {files.reservationsRecentes.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 border-b border-gray-50 pb-2">
                <span>
                  <span className="font-mono text-xs text-gray-500">{r.numero}</span>
                  <span className="ml-2">{r.client?.nom}</span>
                  <span className="text-gray-500"> → {r.prestataire?.nomEntreprise}</span>
                </span>
                <span className="shrink-0 text-xs">{r.statut}</span>
              </li>
            ))}
          </ul>
        </Carte>

        <Carte>
          <div className="mb-3 flex items-center gap-1 font-semibold text-gray-900">
            <Package className="h-4 w-4" /> Abonnements bientôt expirés
          </div>
          <ul className="space-y-2 text-sm">
            {files.abonnementsExpirant.length === 0 && (
              <li className="text-gray-500">Aucun abonnement critique.</li>
            )}
            {files.abonnementsExpirant.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 border-b border-gray-50 pb-2">
                <span>
                  <span className="font-medium">{a.prestataire?.nomEntreprise}</span>
                  <span className="text-gray-500"> · {a.plan?.nom}</span>
                </span>
                <span className="text-xs text-amber-600">
                  {new Date(a.dateFin).toLocaleDateString("fr-FR")}
                </span>
              </li>
            ))}
          </ul>
        </Carte>
      </div>
    </div>
  );
}
