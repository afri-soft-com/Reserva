"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Trash2, ChevronLeft, RefreshCw } from "lucide-react";
import { Carte } from "../../components/Carte";
import { Bouton } from "../../components/Bouton";
import { toastErreur, toastSucces } from "../../components/Toast";
import { extraireMessageErreur } from "../../lib/api-client";
import {
  listerNotifications,
  marquerLue,
  marquerToutesLues,
  supprimerNotification,
  NotificationItem,
} from "../../lib/api-notifications";
import { useAuthStore } from "../../lib/store-auth";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function PageNotifications() {
  const router = useRouter();
  const { estConnecte } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!estConnecte) {
      router.push("/connexion");
      return;
    }
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estConnecte]);

  async function charger() {
    setChargement(true);
    try {
      setNotifications(await listerNotifications());
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function gererMarquerLue(notification: NotificationItem) {
    if (notification.lu) return;
    try {
      await marquerLue(notification.id);
      setNotifications((precedentes) =>
        precedentes.map((n) => (n.id === notification.id ? { ...n, lu: true } : n))
      );
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    }
  }

  async function gererToutesLues() {
    try {
      await marquerToutesLues();
      setNotifications((precedentes) => precedentes.map((n) => ({ ...n, lu: true })));
      toastSucces("Toutes les notifications sont marquées comme lues.");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    }
  }

  async function gererSupprimer(notificationId: string) {
    try {
      await supprimerNotification(notificationId);
      setNotifications((precedentes) => precedentes.filter((n) => n.id !== notificationId));
      toastSucces("Notification supprimée.");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    }
  }

  const nonLues = notifications.filter((n) => !n.lu).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">
            {nonLues > 0 ? `${nonLues} notification(s) non lue(s)` : "Tout est à jour."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bouton variante="fantome" taille="sm" onClick={gererToutesLues} disabled={nonLues === 0}>
            <CheckCheck className="h-4 w-4" /> Tout marquer lu
          </Bouton>
          <Bouton variante="fantome" taille="sm" onClick={charger}>
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Bouton>
          <Bouton variante="fantome" taille="sm" onClick={() => router.push("/profil")}>
            <ChevronLeft className="h-4 w-4" /> Profil
          </Bouton>
        </div>
      </div>

      {chargement && <p className="text-gray-500">Chargement des notifications...</p>}

      {!chargement && notifications.length === 0 && (
        <Carte className="text-center text-gray-500">
          <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          Aucune notification pour le moment.
        </Carte>
      )}

      <div className="space-y-3">
        {notifications.map((notification) => (
          <Carte
            key={notification.id}
            className={`cursor-pointer transition-colors ${notification.lu ? "" : "border-primaire bg-primaire-50/40"}`}
          >
            <div
              className="flex items-start justify-between gap-3"
              onClick={() => gererMarquerLue(notification)}
            >
              <div>
                <div className="flex items-center gap-2">
                  {!notification.lu && <span className="h-2 w-2 rounded-full bg-primaire" />}
                  <p className={`font-semibold text-gray-900 ${notification.lu ? "" : ""}`}>{notification.titre}</p>
                </div>
                <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(notification.creeLe)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  gererSupprimer(notification.id);
                }}
                className="rounded-full p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Carte>
        ))}
      </div>
    </div>
  );
}
