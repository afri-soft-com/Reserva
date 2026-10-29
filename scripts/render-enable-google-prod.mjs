#!/usr/bin/env node
/**
 * Pose MODE_GOOGLE=production (+ GOOGLE_CLIENT_IDS si fourni) sur reserva-core, puis redeploy.
 * Env: RENDER_API_KEY, RENDER_SERVICE_CORE
 * Optionnel: GOOGLE_CLIENT_IDS (sinon conserve la valeur Render existante)
 */
const API = "https://api.render.com/v1";
const key = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_CORE;
const googleClients = (process.env.GOOGLE_CLIENT_IDS || "").trim();

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

async function main() {
  console.log(`→ Upsert Google Sign-In prod sur service ${serviceId}`);
  await upsertEnv("MODE_GOOGLE", "production");
  if (googleClients) await upsertEnv("GOOGLE_CLIENT_IDS", googleClients);
  const deployId = await deploy();
  console.log(`✓ Deploy core lancé (${deployId}). SIM-GOOGLE refusé.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
