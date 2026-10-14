"use client";

import { useEffect, useMemo, useState } from "react";
import { UserCog, Search, Printer } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur, clientApi } from "../../../lib/api-client";
import {
  activerAgent,
  desactiverAgent,
  listerAgents,
  modifierCommissionAgent,
} from "../../../lib/api-agents";
import { imprimerElement, tableVersHtml } from "../../../lib/impression";

export default function PageAdminAgents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [telephone, setTelephone] = useState("");
  const [commission, setCommission] = useState("2");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    charger();
  }, []);

  const agentsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.nom?.toLowerCase().includes(q) ||
        a.telephone?.toLowerCase().includes(q) ||
        (a.codeParrainage || "").toLowerCase().includes(q)
    );
  }, [agents, recherche]);

  async function charger() {
    setChargement(true);
    try {
      setAgents(await listerAgents());
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setChargement(false);
    }
  }

  function imprimer() {
    imprimerElement(
      "Agents de quartier",
      tableVersHtml(
        ["Nom", "Téléphone", "Commission %", "Réservations", "Code"],
        agentsFiltres.map((a) => [
          a.nom || "—",
          a.telephone || "—",
          String(a.commissionPourcent ?? "—"),
          String(a.nombreReservations ?? 0),
          a.codeParrainage || "—",
        ])
      )
    );
  }

  async function activer() {
    try {
      const { data } = await clientApi.get("/admin/utilisateurs", {
        params: { recherche: telephone.trim(), parPage: 5 },
      });
      const items = data?.donnees?.items ?? data?.items ?? [];
      const u = Array.isArray(items)
        ? items.find((x: any) => x.telephone?.includes(telephone.replace(/\s/g, ""))) ?? items[0]
        : null;
      if (!u?.id) {
        toastErreur("Utilisateur introuvable — vérifiez le téléphone");
        return;
      }
      await activerAgent(u.id, Number(commission));
      toastSucces("Agent activé");
      setTelephone("");
      await charger();
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <UserCog className="w-6 h-6" /> Agents de quartier
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Commission par défaut réglable dans Tarifications (`COMMISSION_AGENT`). Ici : activer / ajuster par agent.
          </p>
        </div>
        <Bouton variante="fantome" taille="sm" onClick={imprimer} disabled={agentsFiltres.length === 0}>
          <Printer className="h-4 w-4" /> Imprimer
        </Bouton>
      </div>

      <Carte>
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <label className="text-sm">
            Téléphone client
            <input
              className="mt-1 block w-56 rounded-lg border px-3 py-2 text-sm"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+243..."
            />
          </label>
          <label className="text-sm">
            Commission %
            <input
              className="mt-1 block w-24 rounded-lg border px-3 py-2 text-sm"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              type="number"
              step="0.5"
              min="0.5"
              max="10"
            />
          </label>
          <Bouton onClick={activer}>Activer comme agent</Bouton>
        </div>
      </Carte>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Filtrer par nom, téléphone, code…"
          className="h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm"
        />
      </div>

      {chargement ? (
        <p>Chargement…</p>
      ) : agentsFiltres.length === 0 ? (
        <Carte>
          <p className="p-4 text-sm">
            {agents.length === 0
              ? "Aucun agent. Activez un compte CLIENT ci-dessus."
              : "Aucun agent ne correspond à la recherche."}
          </p>
        </Carte>
      ) : (
        <div className="space-y-2">
          {agentsFiltres.map((a) => (
            <Carte key={a.id}>
              <div className="p-4 flex flex-wrap justify-between gap-3 items-center">
                <div>
                  <strong>{a.nom}</strong>
                  <p className="text-sm text-gray-500">
                    {a.telephone} · {a.nombreReservations ?? 0} résa · code {a.codeParrainage ?? "—"}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    className="w-20 rounded border px-2 py-1 text-sm"
                    defaultValue={a.commissionPourcent}
                    step="0.5"
                    min="0.5"
                    max="10"
                    id={`c-${a.id}`}
                  />
                  <Bouton
                    taille="sm"
                    onClick={async () => {
                      const el = document.getElementById(`c-${a.id}`) as HTMLInputElement;
                      try {
                        await modifierCommissionAgent(a.id, Number(el.value));
                        toastSucces("Commission mise à jour");
                        charger();
                      } catch (e) {
                        toastErreur(extraireMessageErreur(e));
                      }
                    }}
                  >
                    Sauver %
                  </Bouton>
                  <Bouton
                    taille="sm"
                    variante="secondaire"
                    onClick={async () => {
                      try {
                        await desactiverAgent(a.id);
                        toastSucces("Repassé en CLIENT");
                        charger();
                      } catch (e) {
                        toastErreur(extraireMessageErreur(e));
                      }
                    }}
                  >
                    Désactiver
                  </Bouton>
                </div>
              </div>
            </Carte>
          ))}
        </div>
      )}
    </div>
  );
}
