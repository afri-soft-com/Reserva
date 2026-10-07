/**
 * Smoke Vague 1 — gateway santé + login admin + catalogues hotels/transport.
 * Usage: node scripts/smoke-local.mjs
 */
const GATEWAY = process.env.GATEWAY_URL || "http://localhost:4000/api";

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

async function main() {
  console.log("→ Santé gateway");
  const sante = await get("/sante");
  console.log("  ", JSON.stringify(sante).slice(0, 200));

  console.log("→ Login admin");
  const telephone = process.env.SMOKE_ADMIN_PHONE || "+243900000001";
  const pin = process.env.SMOKE_ADMIN_PIN || "1234";
  const auth = await post("/auth/connexion", { telephone, pin });
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

  console.log("\n✓ Smoke local OK — Vague 1 prête");
}

main().catch((e) => {
  console.error("\n✗ Smoke échoué:", e.message);
  process.exit(1);
});
