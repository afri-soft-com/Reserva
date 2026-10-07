"use client";

import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
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

export default function PageAdminAgents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [telephone, setTelephone] = useState("");
  const [commission, setCommission] = useState("2");

  useEffect(() => {
    charger();
  }, []);

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

  async function activer() {
    try {
      const { data } = await clientApi.get("/admin/utilisateurs", {
        params: { recherche: telephone.trim(), parPage: 5 },
      });
      const items = data?.data?.items ?? data?.items ?? data?.data ?? [];
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
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <UserCog className="w-6 h-6" /> Agents de quartier
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Commission par défaut réglable dans Tarifications (`COMMISSION_AGENT`). Ici : activer / ajuster par agent.
        </p>
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

      {chargement ? (
        <p>Chargement…</p>
      ) : agents.length === 0 ? (
        <Carte>
          <p className="p-4 text-sm">Aucun agent. Activez un compte CLIENT ci-dessus.</p>
        </Carte>
      ) : (
        <div className="space-y-2">
          {agents.map((a) => (
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
