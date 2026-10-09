/**
 * Smoke production — bloquant avant Play/App Store.
 * Usage:
 *   GATEWAY_URL=https://.../api SMOKE_ADMIN_PHONE=... SMOKE_ADMIN_PIN=... \
 *   node scripts/smoke-production.mjs
 */
import { executerParcoursSmoke } from "./lib/smoke-parcours.mjs";

const GATEWAY = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
const PHONE = process.env.SMOKE_ADMIN_PHONE;
const PIN = process.env.SMOKE_ADMIN_PIN;

async function main() {
  if (!GATEWAY) throw new Error("GATEWAY_URL requis");
  if (!PHONE || !PIN) throw new Error("SMOKE_ADMIN_PHONE et SMOKE_ADMIN_PIN requis");

  console.log("→ Smoke production", GATEWAY);
  await executerParcoursSmoke({
    gateway: GATEWAY,
    phone: PHONE,
    pin: PIN,
    waitHealth: true,
    maxAttempts: Number(process.env.SMOKE_HEALTH_ATTEMPTS || 42),
    delayMs: Number(process.env.SMOKE_HEALTH_DELAY_MS || 10000),
  });
  console.log("\n✓ Smoke production OK — stores autorisés");
}

main().catch((e) => {
  console.error("\n✗ Smoke production échoué:", e.message);
  process.exit(1);
});
