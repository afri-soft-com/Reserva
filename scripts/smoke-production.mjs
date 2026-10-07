/**
 * Smoke production — même parcours que smoke local, credentials via env.
 * Usage:
 *   GATEWAY_URL=https://api.example/api \
 *   SMOKE_ADMIN_PHONE=+243... SMOKE_ADMIN_PIN=.... \
 *   node scripts/smoke-production.mjs
 */
const GATEWAY = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
const PHONE = process.env.SMOKE_ADMIN_PHONE;
const PIN = process.env.SMOKE_ADMIN_PIN;

async function get(path, token) {
  const res = await fetch(`${GATEWAY}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.succes === false) {
    throw new Error(`${path} → ${res.status} ${json?.erreur?.message || res.statusText}`);
  }
  return json.donnees ?? json;
}

async function post(path, body) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.succes === false) {
    throw new Error(`${path} → ${res.status} ${json?.erreur?.message || res.statusText}`);
  }
  return json.donnees ?? json;
}

async function attendreSante(maxAttempts = 30, delayMs = 10000) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const sante = await get("/sante");
      const deps = sante.dependances || {};
      const ok =
        sante.statut === "operationnel" &&
        Object.values(deps).every((v) => v === "operationnel" || v === undefined);
      if (ok || sante.statut === "operationnel") {
        console.log(`  santé OK (tentative ${i})`, JSON.stringify(sante).slice(0, 220));
        return sante;
      }
      console.log(`  santé partielle (tentative ${i}):`, sante.statut, deps);
    } catch (e) {
      console.log(`  santé indisponible (tentative ${i}):`, e.message);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Gateway prod non healthy après attente");
}

async function main() {
  if (!GATEWAY) throw new Error("GATEWAY_URL requis");
  if (!PHONE || !PIN) throw new Error("SMOKE_ADMIN_PHONE et SMOKE_ADMIN_PIN requis");

  console.log("→ Smoke production", GATEWAY);
  console.log("→ Attente santé gateway");
  await attendreSante();

  console.log("→ Login admin");
  const auth = await post("/auth/connexion", { telephone: PHONE, pin: PIN });
  const token = auth.token || auth.accessToken;
  if (!token) throw new Error("Pas de token admin");
  console.log("  OK admin", auth.utilisateur?.nom || auth.utilisateur?.role);

  console.log("→ Pilotage admin");
  const pilotage = await get("/admin/pilotage", token);
  console.log("  alertes", pilotage.alertes);

  console.log("→ Finances");
  const finances = await get("/economie/admin/finances?periode=mois", token);
  console.log("  GMV", finances.gmv, "takeRate", finances.takeRate);

  console.log("→ Hôtels");
  const hotels = await get("/hotels", token);
  console.log("  items", hotels.total ?? hotels.items?.length);

  console.log("→ Transport villes");
  const villes = await get("/transport/villes", token);
  console.log("  villes", Array.isArray(villes) ? villes.length : villes);

  console.log("\n✓ Smoke production OK");
}

main().catch((e) => {
  console.error("\n✗ Smoke production échoué:", e.message);
  process.exit(1);
});
