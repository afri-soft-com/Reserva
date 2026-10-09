/** Helper HTTP typé pour les tests d'intégration. */

export type ApiData = Record<string, any>;

export async function apiFetch(
  gateway: string,
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; json: ApiData; data: ApiData }> {
  const res = await fetch(`${gateway.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as ApiData;
  const data = (json.donnees ?? json) as ApiData;
  return { status: res.status, json, data };
}
