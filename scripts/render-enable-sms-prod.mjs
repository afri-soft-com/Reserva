/**
 * Passe MODE_SMS=production sur reserva-core (Render) et pose AFRISOFT_HUB_*.
 * Relance un deploy core pour prendre en compte les env vars.
 *
 * Env requis:
 *   RENDER_API_KEY, RENDER_SERVICE_CORE
 *   AFRISOFT_HUB_APP_ID, AFRISOFT_HUB_API_KEY
 * Optionnel: AFRISOFT_SMS_HUB_URL (défaut https://sms.afri-soft.com)
 */
const API = "https://api.render.com/v1";
const key = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_CORE;
const appId = process.env.AFRISOFT_HUB_APP_ID;
const apiKey = process.env.AFRISOFT_HUB_API_KEY;
const smsHubUrl = (process.env.AFRISOFT_SMS_HUB_URL || "https://sms.afri-soft.com").replace(/\/$/, "");

if (!key || !serviceId) {
  console.error("RENDER_API_KEY / RENDER_SERVICE_CORE manquants");
  process.exit(1);
}
if (!appId || !apiKey) {
  console.error("AFRISOFT_HUB_APP_ID / AFRISOFT_HUB_API_KEY manquants");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function getEnvVars() {
  const res = await fetch(`${API}/services/${serviceId}/env-vars`, { headers });
  if (!res.ok) throw new Error(`GET env-vars → ${res.status} ${await res.text()}`);
  const data = await res.json();
  // Render renvoie [{ envVar: { key, value } }] ou [{ key, value }]
  return (Array.isArray(data) ? data : []).map((row) => row.envVar || row);
}

async function putEnvVars(vars) {
  const body = vars.map(({ key: k, value }) => ({ key: k, value }));
  const res = await fetch(`${API}/services/${serviceId}/env-vars`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT env-vars → ${res.status} ${await res.text()}`);
  return res.json();
}

async function deploy() {
  const res = await fetch(`${API}/services/${serviceId}/deploys`, {
    method: "POST",
    headers,
    body: "{}",
  });
  if (!res.ok) throw new Error(`POST deploy → ${res.status} ${await res.text()}`);
  return res.json();
}

function upsert(list, k, value) {
  const i = list.findIndex((e) => e.key === k);
  if (i >= 0) list[i] = { ...list[i], key: k, value };
  else list.push({ key: k, value });
}

async function main() {
  console.log(`→ Lecture env-vars service ${serviceId}`);
  const current = await getEnvVars();
  const next = current
    .filter((e) => e.key && e.value !== undefined && e.value !== null)
    .map((e) => ({ key: e.key, value: String(e.value) }));

  upsert(next, "MODE_SMS", "production");
  upsert(next, "AFRISOFT_HUB_APP_ID", appId);
  upsert(next, "AFRISOFT_HUB_API_KEY", apiKey);
  upsert(next, "AFRISOFT_SMS_HUB_URL", smsHubUrl);

  console.log("→ Mise à jour MODE_SMS=production + clés hub AfriSoft");
  await putEnvVars(next);

  const mode = next.find((e) => e.key === "MODE_SMS")?.value;
  const hasApp = next.some((e) => e.key === "AFRISOFT_HUB_APP_ID" && e.value);
  const hasKey = next.some((e) => e.key === "AFRISOFT_HUB_API_KEY" && e.value);
  console.log(`  MODE_SMS=${mode} | APP_ID=${hasApp ? "ok" : "manquant"} | API_KEY=${hasKey ? "ok" : "manquant"}`);

  console.log("→ Déclenchement redeploy core");
  const d = await deploy();
  const deployId = d?.deploy?.id || d?.id || "?";
  console.log(`✓ Deploy lancé (${deployId}). Attendre le live puis retester OTP sur un numéro réel.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
