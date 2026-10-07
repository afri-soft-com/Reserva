import { env } from "../config/env";
import { ErreurValidation } from "@reserva/service-kit";

async function appeler<T>(chemin: string, init: RequestInit & { token?: string }): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Secret": env.SERVICE_SECRET,
  };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const { token: _t, ...reste } = init;
  const res = await fetch(`${env.TRANSPORT_URL}${chemin}`, {
    ...reste,
    headers,
    signal: AbortSignal.timeout(12_000),
  });
  const corps = (await res.json().catch(() => ({}))) as {
    succes?: boolean;
    donnees?: T;
    erreur?: { message?: string };
  };
  if (!res.ok || corps.succes === false) {
    throw new ErreurValidation(corps.erreur?.message || `Service transport: ${res.status}`);
  }
  return (corps.donnees ?? corps) as T;
}

export function reserverPlaces(token: string, body: unknown) {
  return appeler("/api/transport/inventaire/reserver", { method: "POST", token, body: JSON.stringify(body) });
}

export function confirmerPlaces(token: string, body: unknown) {
  return appeler("/api/transport/inventaire/confirmer", { method: "POST", token, body: JSON.stringify(body) });
}

export function libererPlaces(token: string, body: unknown) {
  return appeler("/api/transport/inventaire/liberer", { method: "POST", token, body: JSON.stringify(body) });
}
