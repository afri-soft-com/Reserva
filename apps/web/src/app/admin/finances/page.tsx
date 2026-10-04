"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Percent,
  Repeat,
  Wallet,
  Settings2,
  TrendingUp,
  Building2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { Carte } from "../../../components/Carte";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { FinancesAdmin, obtenirFinancesAdmin, simulerTarification } from "../../../lib/api-economie";
import { formaterMontant } from "@reserva/shared";
import { Bouton } from "../../../components/Bouton";

const COULEURS = ["#1A56DB", "#F5A623", "#10B981", "#8B5CF6", "#EF4444"];

export default function PageAdminFinances() {
  const [periode, setPeriode] = useState("mois");
  const [stats, setStats] = useState<FinancesAdmin | null>(null);
  const [chargement, setChargement] = useState(true);
  const [simPrix, setSimPrix] = useState("100");
  const [simDevise, setSimDevise] = useState<"USD" | "CDF">("USD");
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    setChargement(true);
    obtenirFinancesAdmin(periode)
      .then(setStats)
      .catch((e) => toastErreur(extraireMessageErreur(e)))
      .finally(() => setChargement(false));
  }, [periode]);

  async function lancerSimulation() {
    try {
      const r = await simulerTarification(parseFloat(simPrix), simDevise);
      setSimResult(r);
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    }
  }

  if (chargement) return <p className="text-gray-500">Chargement…</p>;
  if (!stats) return <p className="text-gray-500">Aucune donnée financière.</p>;

  const pieData = Object.entries(stats.parType || {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finances plateforme</h1>
          <p className="text-sm text-gray-500">GMV, commissions, take rate, MRR et configuration tarifaire.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/ledger" className="text-sm text-primaire hover:underline">Journal</Link>
          <Link href="/admin/versements" className="text-sm text-primaire hover:underline">Versements</Link>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
          >
            <option value="semaine">Cette semaine</option>
            <option value="mois">Ce mois</option>
            <option value="annee">Cette année</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Carte>
          <p className="flex items-center gap-1 text-sm text-gray-500"><DollarSign className="h-4 w-4" /> GMV encaissé</p>
          <p className="text-2xl font-bold text-gray-900">{formaterMontant(stats.gmv, "CDF")}</p>
          <p className="text-xs text-gray-500">{stats.reservations?.payees ?? 0} réservations payées</p>
        </Carte>
        <Carte>
          <p className="flex items-center gap-1 text-sm text-gray-500"><Wallet className="h-4 w-4" /> Recette nette RESERVA</p>
          <p className="text-2xl font-bold text-emerald-600">{formaterMontant(stats.recetteNette, "CDF")}</p>
          <p className="text-xs text-gray-500">Brute {formaterMontant(stats.recetteBrute, "CDF")}</p>
        </Carte>
        <Carte>
          <p className="flex items-center gap-1 text-sm text-gray-500"><Percent className="h-4 w-4" /> Take rate</p>
          <p className="text-2xl font-bold text-primaire">{stats.takeRate} %</p>
          <p className="text-xs text-gray-500">
            Commission défaut {stats.config?.commissionPrestataireDefaut ?? "—"} %
          </p>
        </Carte>
        <Carte>
          <p className="flex items-center gap-1 text-sm text-gray-500"><Repeat className="h-4 w-4" /> Abonnements actifs</p>
          <p className="text-2xl font-bold text-gray-900">{stats.abonnementsActifs}</p>
          <p className="text-xs text-gray-500">
            MRR {formaterMontant(stats.mrr.CDF, "CDF")} + {formaterMontant(stats.mrr.USD, "USD")}
          </p>
        </Carte>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Carte>
          <p className="text-sm text-gray-500">Commissions (ledger)</p>
          <p className="text-lg font-bold">{formaterMontant(stats.parType.COMMISSION || 0, "CDF")}</p>
        </Carte>
        <Carte>
          <p className="text-sm text-gray-500">Frais de service</p>
          <p className="text-lg font-bold">{formaterMontant(stats.parType.FRAIS_SERVICE || 0, "CDF")}</p>
        </Carte>
        <Carte>
          <p className="text-sm text-gray-500">Abonnements encaissés</p>
          <p className="text-lg font-bold">{formaterMontant(stats.parType.ABONNEMENT || 0, "CDF")}</p>
        </Carte>
        <Carte>
          <p className="text-sm text-gray-500">Net dû prestataires (période)</p>
          <p className="text-lg font-bold">{formaterMontant(stats.reservations?.netPrestataires || 0, "CDF")}</p>
        </Carte>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Carte className="lg:col-span-2">
          <p className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
            <TrendingUp className="h-4 w-4" /> Évolution GMV / recette
          </p>
          <p className="mb-3 text-xs text-gray-500">
            {stats.versements.nombreEnAttente} versement(s) en attente
            ({formaterMontant(stats.versements.enAttente, "CDF")}) · payés période{" "}
            {formaterMontant(stats.versements.payesPeriode, "CDF")}
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.evolution}>
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="gmv" name="GMV" fill="#1A56DB" />
                <Bar dataKey="recette" name="Recette" fill="#F5A623" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Carte>

        <Carte>
          <p className="mb-3 text-sm font-medium text-gray-700">Répartition recettes</p>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-500">Pas encore d&apos;écritures plateforme.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Carte>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Carte>
          <p className="mb-3 flex items-center gap-1 text-sm font-medium text-gray-700">
            <Building2 className="h-4 w-4" /> Top prestataires (volume net CDF)
          </p>
          <ul className="space-y-2 text-sm">
            {(stats.topPrestataires || []).length === 0 && (
              <li className="text-gray-500">Pas encore de volume crédité.</li>
            )}
            {(stats.topPrestataires || []).map((p, i) => (
              <li key={p.prestataireId} className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span>
                  <span className="mr-2 text-xs text-gray-400">{i + 1}.</span>
                  <span className="font-medium">{p.nomEntreprise}</span>
                  <span className="text-gray-500"> · {p.ville}</span>
                </span>
                <span className="font-semibold">{formaterMontant(p.volumeCdf, "CDF")}</span>
              </li>
            ))}
          </ul>
          <Link href="/admin/soldes" className="mt-3 inline-block text-xs text-primaire">Voir tous les soldes →</Link>
        </Carte>

        <Carte>
          <p className="mb-3 flex items-center gap-1 text-sm font-medium text-gray-700">
            <Settings2 className="h-4 w-4" /> Config tarifaire active
          </p>
          {stats.config ? (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-gray-500">Commission</dt><dd className="font-semibold">{stats.config.commissionPrestataireDefaut} %</dd></div>
              <div><dt className="text-gray-500">Taux USD→CDF</dt><dd className="font-semibold">{stats.config.tauxUsdCdf}</dd></div>
              <div><dt className="text-gray-500">Frais service USD</dt><dd className="font-semibold">{formaterMontant(stats.config.fraisServiceMontantUsd, "USD")}</dd></div>
              <div><dt className="text-gray-500">Frais service CDF</dt><dd className="font-semibold">{formaterMontant(stats.config.fraisServiceMontantCdf, "CDF")}</dd></div>
              <div><dt className="text-gray-500">Seuil frais</dt><dd className="font-semibold">{stats.config.fraisServiceSeuilUsd} USD</dd></div>
              <div><dt className="text-gray-500">Min. versement</dt><dd className="font-semibold">{formaterMontant(stats.config.versementMinimumCdf, "CDF")}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Config indisponible.</p>
          )}
          <Link href="/admin/tarifications" className="mt-3 inline-block text-xs text-primaire">Modifier les clés →</Link>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Simulateur de tarification</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                value={simPrix}
                onChange={(e) => setSimPrix(e.target.value)}
                className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={simDevise}
                onChange={(e) => setSimDevise(e.target.value as "USD" | "CDF")}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="USD">USD</option>
                <option value="CDF">CDF</option>
              </select>
              <Bouton taille="sm" onClick={lancerSimulation}>Simuler</Bouton>
            </div>
            {simResult && (
              <dl className="mt-3 grid grid-cols-2 gap-1 text-xs">
                <div>Commission: <strong>{formaterMontant(simResult.montantCommission, simDevise)}</strong></div>
                <div>Frais: <strong>{formaterMontant(simResult.montantFraisService, simDevise)}</strong></div>
                <div>Net prestataire: <strong>{formaterMontant(simResult.montantNetPrestataire, simDevise)}</strong></div>
                <div>Total client: <strong>{formaterMontant(simResult.montantTotalClient, simDevise)}</strong></div>
              </dl>
            )}
          </div>
        </Carte>
      </div>

      {(stats.ecrituresRecentes || []).length > 0 && (
        <Carte>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Dernières écritures</p>
            <Link href="/admin/ledger" className="text-xs text-primaire">Journal complet</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Compte</th>
                  <th className="px-2 py-2">Sens</th>
                  <th className="px-2 py-2">Montant</th>
                  <th className="px-2 py-2">Prestataire</th>
                </tr>
              </thead>
              <tbody>
                {stats.ecrituresRecentes!.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="px-2 py-2 text-gray-500">{new Date(e.creeLe).toLocaleString("fr-FR")}</td>
                    <td className="px-2 py-2">{e.type}</td>
                    <td className="px-2 py-2">{e.compte}</td>
                    <td className="px-2 py-2">{e.sens}</td>
                    <td className="px-2 py-2 font-semibold">{formaterMontant(e.montant, e.devise)}</td>
                    <td className="px-2 py-2">{e.prestataire?.nomEntreprise || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Carte>
      )}
    </div>
  );
}
