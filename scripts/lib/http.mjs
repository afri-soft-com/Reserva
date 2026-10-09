/** Helpers HTTP partagés smoke / intégration Node. */

export async function request(gateway, method, path, { body, token } = {}) {
  const res = await fetch(`${gateway.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, ok: res.ok && json.succes !== false };
}

export function donnees(json) {
  return json.donnees ?? json;
}
