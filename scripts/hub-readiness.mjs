/**
 * Vérification lecture seule : gateway /sante + ping HMAC hub pay (sans créer de paiement).
 *
 * Usage:
 *   GATEWAY_URL=https://.../api node scripts/hub-readiness.mjs
 *
 * Env:
 *   AFRISOFT_HUB_APP_ID / AFRISOFT_HUB_API_KEY — si absents → soft-fail (exit 0) sauf HUB_READINESS_REQUIRE=1
 *   AFRISOFT_PAY_HUB_URL — défaut https://pay.afri-soft.com
 *   AFRISOFT_SMS_HUB_URL — optionnel, ping TCP/HTTPS
 */
import crypto from "node:crypto";

const GATEWAY = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
const REQUIRE =
  process.env.HUB_READINESS_REQUIRE === "1" || process.env.HUB_READINESS_REQUIRE === "true";
const APP_ID = (process.env.AFRISOFT_HUB_APP_ID || "").trim().toLowerCase();
const API_KEY = (process.env.AFRISOFT_HUB_API_KEY || "").trim();
const PAY_HUB = (process.env.AFRISOFT_PAY_HUB_URL || "https://pay.afri-soft.com").replace(/\/$/, "");
const SMS_HUB = (process.env.AFRISOFT_SMS_HUB_URL || "https://sms.afri-soft.com").replace(/\/$/, "");

function signer(secret, timestamp, method, path, rawBody) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${method.toUpperCase()}.${path}.${rawBody}`)
    .digest("hex");
}

async function checkGateway() {
  if (!GATEWAY) throw new Error("GATEWAY_URL requis");
  const url = `${GATEWAY}/sante`;
  console.log("→ Gateway sante", url);
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Gateway /sante HTTP ${res.status}`);
  }
  const statut = json.statut || json.status || "";
  if (!statut && !json.base) {
    throw new Error("Réponse /sante inattendue");
  }
  console.log("  ✓", statut || json.base, "redis=", json.redis ?? "n/a");
}

async function checkPayHub() {
  if (!APP_ID || !API_KEY) {
    const msg = "AFRISOFT_HUB_APP_ID / AFRISOFT_HUB_API_KEY absents — skip hub pay";
    if (REQUIRE) throw new Error(msg);
    console.log("  ⚠", msg);
    return;
  }

  const path = `/v1/payments/by-reference/ci-readiness-probe-${Date.now()}`;
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = signer(API_KEY, ts, "GET", path, "");
  console.log("→ Hub pay HMAC GET", `${PAY_HUB}${path}`);

  const res = await fetch(`${PAY_HUB}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-AfriSoft-App-Id": APP_ID,
      "X-AfriSoft-Api-Key": API_KEY,
      "X-AfriSoft-Timestamp": ts,
      "X-AfriSoft-Signature": signature,
    },
  });

  // 404 / 400 = hub joignable + auth OK ; 401/403 = secrets invalides
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Hub pay auth refusée (HTTP ${res.status}) — vérifier AFRISOFT_HUB_*`);
  }
  if (res.status === 0) {
    throw new Error("Hub pay injoignable");
  }
  console.log(`  ✓ Hub pay joignable (HTTP ${res.status})`);
}

async function checkSmsHubReachable() {
  console.log("→ SMS hub reachability", SMS_HUB);
  try {
    const res = await fetch(SMS_HUB, { method: "GET", redirect: "manual" });
    console.log(`  ✓ SMS hub répond (HTTP ${res.status})`);
  } catch (e) {
    const msg = `SMS hub injoignable: ${e.message}`;
    if (REQUIRE && APP_ID && API_KEY) throw new Error(msg);
    console.log("  ⚠", msg);
  }
}

async function main() {
  console.log("→ Hub readiness (lecture seule, pas de paiement USSD)");
  await checkGateway();
  await checkPayHub();
  await checkSmsHubReachable();
  console.log("✓ Hub readiness OK");
}

main().catch((e) => {
  console.error("✗ Hub readiness échoué:", e.message);
  process.exit(1);
});
