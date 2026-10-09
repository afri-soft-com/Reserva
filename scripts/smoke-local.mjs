/**
 * Smoke local — plateforme CI / dev.
 * Usage: GATEWAY_URL=http://127.0.0.1:4000/api node scripts/smoke-local.mjs
 */
import { executerParcoursSmoke } from "./lib/smoke-parcours.mjs";

const GATEWAY = process.env.GATEWAY_URL || "http://127.0.0.1:4000/api";

async function main() {
  console.log("→ Smoke local", GATEWAY);
  await executerParcoursSmoke({
    gateway: GATEWAY,
    phone: process.env.SMOKE_ADMIN_PHONE || "+243900000001",
    pin: process.env.SMOKE_ADMIN_PIN || "1234",
    waitHealth: "short",
    ecriture: true,
    clientPhone: process.env.SMOKE_CLIENT_PHONE || "+243991234567",
    proPhone: process.env.SMOKE_PRO_PHONE || "+243970000001",
  });
  console.log("\n✓ Smoke local OK (lecture + écriture)");
}

main().catch((e) => {
  console.error("\n✗ Smoke local échoué:", e.message);
  process.exit(1);
});
