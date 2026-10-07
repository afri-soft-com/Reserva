import { env } from "../config/env";
import { ErreurValidation } from "@reserva/service-kit";

async function appeler<T>(chemin: string, init: RequestInit & { token?: string }): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Secret": env.SERVICE_SECRET,
  };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const { token: _token, ...reste } = init;
  const res = await fetch(`${env.HOTELS_URL}${chemin}`, {
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
    throw new ErreurValidation(corps.erreur?.message || `Service hotels: ${res.status}`);
  }
  return (corps.donnees ?? corps) as T;
}

export function reserverInventaire(token: string, body: unknown) {
  return appeler("/api/hotels/inventaire/reserver", { method: "POST", token, body: JSON.stringify(body) });
}

export function confirmerInventaire(token: string, body: unknown) {
  return appeler("/api/hotels/inventaire/confirmer", { method: "POST", token, body: JSON.stringify(body) });
}

export function libererInventaire(token: string, body: unknown) {
  return appeler("/api/hotels/inventaire/liberer", { method: "POST", token, body: JSON.stringify(body) });
}
