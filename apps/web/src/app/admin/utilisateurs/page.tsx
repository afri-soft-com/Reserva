"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldOff, Shield } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import {
  bloquerUtilisateurAdmin,
  debloquerUtilisateurAdmin,
  listerTousUtilisateursAdmin,
} from "../../../lib/api-admin";
import { useAuthStore } from "../../../lib/store-auth";

const ROLE_LABEL: Record<string, string> = {
  CLIENT: "Client",
  PRESTATAIRE: "Prestataire",
  ADMIN: "Admin",
  AGENT: "Agent",
};

function estBloque(u: { bloqueJusquA?: string | null }) {
  return !!u.bloqueJusquA && new Date(u.bloqueJusquA).getTime() > Date.now();
}

export default function PageAdminUtilisateurs() {
  const { utilisateur } = useAuthStore();
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await listerTousUtilisateursAdmin(page);
      setUtilisateurs(resultat.items);
      setTotalPages(resultat.totalPages);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function toggleBlocage(u: any) {
    if (u.role === "ADMIN") {
      toastErreur("Impossible de bloquer un administrateur.");
      return;
    }
    setActionId(u.id);
    try {
      if (estBloque(u)) {
        await debloquerUtilisateurAdmin(u.id);
        toastSucces(`${u.nom} débloqué.`);
      } else {
        if (!confirm(`Bloquer ${u.nom} (${u.telephone}) ?`)) return;
        await bloquerUtilisateurAdmin(u.id);
        toastSucces(`${u.nom} bloqué.`);
      }
      await charger();
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setActionId(null);
    }
  }

  if (utilisateur?.role !== "ADMIN") {
    return (
      <Carte>
        <p className="text-center text-gray-500">Accès non autorisé.</p>
      </Carte>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bloquer un compte empêche la connexion (PIN / Google) jusqu&apos;à déblocage.
        </p>
      </div>

      {chargement && <p className="text-gray-500">Chargement...</p>}

      {!chargement && utilisateurs.length === 0 && (
        <Carte className="text-center text-gray-500">Aucun utilisateur trouvé.</Carte>
      )}

      {!chargement && utilisateurs.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <table className="w-full bg-white text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Inscrit le</th>
                  <th className="px-4 py-3">2FA</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {utilisateurs.map((u) => {
                  const bloque = estBloque(u);
                  return (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.nom}</td>
                      <td className="px-4 py-3 text-gray-600">{u.telephone}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-primaire-50 px-2.5 py-0.5 text-xs font-semibold text-primaire-700">
                          {ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {u.creeLe ? new Date(u.creeLe).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.deuxFAActif ? "Oui" : "Non"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            bloque ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {bloque ? "Bloqué" : "Actif"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.role !== "ADMIN" && (
                          <Bouton
                            variante="fantome"
                            taille="sm"
                            chargement={actionId === u.id}
                            onClick={() => toggleBlocage(u)}
                          >
                            {bloque ? (
                              <>
                                <Shield className="h-4 w-4" /> Débloquer
                              </>
                            ) : (
                              <>
                                <ShieldOff className="h-4 w-4 text-red-500" /> Bloquer
                              </>
                            )}
                          </Bouton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Bouton
              variante="fantome"
              taille="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Bouton>
            <span className="text-sm text-gray-600">
              Page {page} / {totalPages}
            </span>
            <Bouton
              variante="fantome"
              taille="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Bouton>
          </div>
        </>
      )}
    </div>
  );
}
