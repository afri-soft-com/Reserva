/**
 * Pose MODE_APPLE=production + APPLE_CLIENT_IDS sur reserva-core, puis redeploy.
 * Env: RENDER_API_KEY, RENDER_SERVICE_CORE
 * Optionnel: APPLE_CLIENT_IDS (défaut com.reserva.client,com.reserva.pro)
 */
const API = "https://api.render.com/v1";
const key = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_CORE;
const appleClients = (
  process.env.APPLE_CLIENT_IDS || "com.reserva.client,com.reserva.pro"
).trim();

if (!key || !serviceId) {
  console.error("RENDER_API_KEY / RENDER_SERVICE_CORE manquants");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function upsertEnv(envKey, value) {
  const res = await fetch(`${API}/services/${serviceId}/env-vars/${encodeURIComponent(envKey)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ value }),
  });
  if (res.ok) {
    console.log(`  ✓ ${envKey}`);
    return;
  }
  if (res.status === 404 || res.status === 405) {
    const res2 = await fetch(`${API}/services/${serviceId}/env-vars`, {
      method: "POST",
      headers,
      body: JSON.stringify([{ key: envKey, value }]),
    });
    if (!res2.ok) throw new Error(`POST env ${envKey} → ${res2.status} ${await res2.text()}`);
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
  for (const k of ["MODE_APPLE", "APPLE_CLIENT_IDS"]) {
    const row = rows.find((r) => r.key === k);
    console.log(`  list ${k}: ${row ? `présent${row.value != null ? `=${row.value}` : " (masqué)"}` : "ABSENT"}`);
  }
}

async function main() {
  console.log(`→ Upsert Apple Sign In prod sur service ${serviceId}`);
  await upsertEnv("MODE_APPLE", "production");
  await upsertEnv("APPLE_CLIENT_IDS", appleClients);
  await verifyListed();
  const deployId = await deploy();
  console.log(`✓ Deploy core lancé (${deployId}).`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
