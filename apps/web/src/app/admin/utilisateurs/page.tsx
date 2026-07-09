"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Shield, ShieldOff } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerTousUtilisateursAdmin } from "../../../lib/api-paiements";
import { useAuthStore } from "../../../lib/store-auth";

const ROLE_LABEL: Record<string, string> = {
  CLIENT: "Client",
  PRESTATAIRE: "Prestataire",
  ADMIN: "Admin",
};

export default function PageAdminUtilisateurs() {
  const { utilisateur } = useAuthStore();
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  if (utilisateur?.role !== "ADMIN") {
    return (
      <Carte>
        <p className="text-center text-gray-500">Accès non autorisé.</p>
      </Carte>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>

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
                </tr>
              </thead>
              <tbody>
                {utilisateurs.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.nom}</td>
                    <td className="px-4 py-3 text-gray-600">{u.telephone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-primaire-50 px-2.5 py-0.5 text-xs font-semibold text-primaire-700">
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(u.creeLe).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      {u.deuxFAActif ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <Shield className="h-3.5 w-3.5" /> Actif
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <ShieldOff className="h-3.5 w-3.5" /> Inactif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Bouton variante="fantome" taille="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Bouton>
            <span className="text-sm text-gray-500">
              Page {page} sur {totalPages}
            </span>
            <Bouton variante="fantome" taille="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Suivant <ChevronRight className="h-4 w-4" />
            </Bouton>
          </div>
        </>
      )}
    </div>
  );
}
