#!/usr/bin/env node
/**
 * Garde-fou CI avant build mobile : API_URL_PROD doit viser la gateway JSON,
 * pas le front web (sinon OTP/login → FormatException <!DOCTYPE html>).
 *
 * Env: API_URL (requis)
 */
const raw = (process.env.API_URL || "").trim().replace(/\/$/, "");

if (!raw) {
  console.error("✗ API_URL / API_URL_PROD manquant");
  process.exit(1);
}

if (/reserva-web|onrender\.com\/?$/i.test(raw) && !/gateway/i.test(raw)) {
  console.error(`✗ API_URL semble pointer vers le front web, pas la gateway: ${raw}`);
  console.error("  Attendu: https://reserva-gateway.onrender.com/api");
  process.exit(1);
}

if (!raw.endsWith("/api")) {
  console.error(`✗ API_URL doit se terminer par /api (reçu: ${raw})`);
  process.exit(1);
}

const url = `${raw}/app/versions`;
console.log(`→ Vérif API_URL ${url}`);

const res = await fetch(url, { headers: { Accept: "application/json" } });
const ct = (res.headers.get("content-type") || "").toLowerCase();
const text = await res.text();

if (!res.ok) {
  console.error(`✗ GET /app/versions → ${res.status}`);
  process.exit(1);
}
if (ct.includes("text/html") || text.trimStart().startsWith("<!")) {
  console.error("✗ L'API a renvoyé du HTML (mauvaise URL ou proxy). Les apps afficheraient FormatException.");
  process.exit(1);
}
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error("✗ Réponse non-JSON:", text.slice(0, 120));
  process.exit(1);
}
const data = json.donnees || json;
if (!data?.client?.minSoft) {
  console.error("✗ /app/versions incomplet:", Object.keys(data || {}));
  process.exit(1);
}

console.log("✓ API_URL OK — JSON gateway (client≥", data.client.minSoft + ")");
