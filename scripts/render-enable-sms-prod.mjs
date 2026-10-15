/**
 * Pose MODE_SMS=production + AFRISOFT_HUB_* sur reserva-core (upsert par clé).
 * Ne remplace PAS toutes les env-vars (évite d'effacer les secrets Render masqués).
 *
 * Env: RENDER_API_KEY, RENDER_SERVICE_CORE, AFRISOFT_HUB_APP_ID, AFRISOFT_HUB_API_KEY
 * Optionnel: AFRISOFT_SMS_HUB_URL
 */
const API = "https://api.render.com/v1";
const key = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_CORE;
const appId = (process.env.AFRISOFT_HUB_APP_ID || "").trim();
const apiKey = (process.env.AFRISOFT_HUB_API_KEY || "").trim();
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

/** Upsert une seule variable — API Render v1 */
async function upsertEnv(envKey, value) {
  // PUT /services/{id}/env-vars/{envVarKey}
  const res = await fetch(`${API}/services/${serviceId}/env-vars/${encodeURIComponent(envKey)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ value }),
  });
  if (res.ok) {
    console.log(`  ✓ ${envKey}`);
    return;
  }
  // Fallback: certains comptes attendent POST collection
  if (res.status === 404 || res.status === 405) {
    const res2 = await fetch(`${API}/services/${serviceId}/env-vars`, {
      method: "POST",
      headers,
      body: JSON.stringify([{ key: envKey, value }]),
    });
    if (!res2.ok) {
      throw new Error(`POST env ${envKey} → ${res2.status} ${await res2.text()}`);
    }
    console.log(`  ✓ ${envKey} (POST)`);
    return;
  }
  throw new Error(`PUT env ${envKey} → ${res.status} ${await res.text()}`);
}

async function deploy() {
  const res = await fetch(`${API}/services/${serviceId}/deploys`, {
    method: "POST",
    headers,
    body: JSON.stringify({ clearCache: "do_not_clear" }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST deploy → ${res.status} ${text.slice(0, 300)}`);
  if (!text.trim()) return "ok-empty-body";
  try {
    const d = JSON.parse(text);
    return d?.deploy?.id || d?.id || "ok";
  } catch {
    return `ok-non-json:${text.slice(0, 40)}`;
  }
}

async function verifyListed() {
  const res = await fetch(`${API}/services/${serviceId}/env-vars`, { headers });
  if (!res.ok) return;
  const data = await res.json();
  const rows = (Array.isArray(data) ? data : []).map((r) => r.envVar || r);
  const keys = new Set(rows.map((r) => r.key));
  for (const k of ["MODE_SMS", "AFRISOFT_HUB_APP_ID", "AFRISOFT_HUB_API_KEY", "AFRISOFT_SMS_HUB_URL"]) {
    console.log(`  list ${k}: ${keys.has(k) ? "présent" : "ABSENT"}`);
  }
  const mode = rows.find((r) => r.key === "MODE_SMS");
  if (mode?.value) console.log(`  MODE_SMS valeur visible=${mode.value}`);
}

async function main() {
  console.log(`→ Upsert SMS prod sur service ${serviceId}`);
  await upsertEnv("MODE_SMS", "production");
  await upsertEnv("AFRISOFT_HUB_APP_ID", appId);
  await upsertEnv("AFRISOFT_HUB_API_KEY", apiKey);
  await upsertEnv("AFRISOFT_SMS_HUB_URL", smsHubUrl);
  await verifyListed();
  const deployId = await deploy();
  console.log(`✓ Deploy core lancé (${deployId}). Attendre live puis retenter OTP.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
