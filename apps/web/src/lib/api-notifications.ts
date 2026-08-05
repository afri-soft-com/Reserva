import { clientApi } from "./api-client";

export interface NotificationItem {
  id: string;
  titre: string;
  message: string;
  type: string;
  lu: boolean;
  reservationId?: string | null;
  creeLe: string;
}

export async function listerNotifications(nonLues?: boolean) {
  const { data } = await clientApi.get("/notifications", {
    params: nonLues ? { nonLues: "true" } : undefined,
  });
  const donnees = data.donnees;
  return (Array.isArray(donnees) ? donnees : []) as NotificationItem[];
}

export async function compterNotificationsNonLues() {
  const { data } = await clientApi.get("/notifications/compteur");
  return (data.donnees as { total: number }).total;
}

export async function marquerLue(notificationId: string) {
  const { data } = await clientApi.patch(`/notifications/${notificationId}/lue`);
  return data.donnees;
}

export async function marquerToutesLues() {
  const { data } = await clientApi.patch("/notifications/toutes-lues");
  return data.donnees;
}

export async function supprimerNotification(notificationId: string) {
  const { data } = await clientApi.delete(`/notifications/${notificationId}`);
  return data.donnees;
}
