#!/usr/bin/env node
/**
 * Nettoyage prod avant test réel :
 * - soft-delete comptes +2438991… (anonymisation ratée)
 * - soft-delete noms faker anglais encore visibles
 * - conserve admin, smoke CI, et comptes métier réels (téléphones non-899)
 *
 * Env: GATEWAY_URL, SMOKE_ADMIN_PHONE, SMOKE_ADMIN_PIN
 */
const gateway = (process.env.GATEWAY_URL || "https://reserva-gateway.onrender.com/api").replace(/\/$/, "");
const phone = process.env.SMOKE_ADMIN_PHONE || "+243900000001";
const pin = process.env.SMOKE_ADMIN_PIN || "1234";

const GARDER_TEL = new Set(["+243900000001", "+243970000001", "+243991234567"]);
/** Comptes métier / déjà validés — jamais toucher, même si le nom « ressemble » à un faker. */
const GARDER_NOMS = new Set([
  "Celestin Kasereka",
  "afriri",
  "mar",
  "Cls",
  "Clinique Espoir",
  "kakike Olivier kiza",
  "Restaurant Le Fleuve d'Or",
  "Kase",
  "Celio",
  "Superadmin RESERVA",
  "Smoke Client CI",
  "Smoke Pro CI",
]);
/** Faker anglo typique (2–4 mots Capitalisés) — exclut les noms composés métier déjà allowlistés. */
const NOM_ANGLAIS = /^[A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,3}$/;

async function login() {
  const res = await fetch(`${gateway}/auth/connexion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telephone: phone, pin }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.succes === false) {
    throw new Error(`login → ${res.status} ${json?.erreur?.message || ""}`);
  }
  const token = json.donnees?.token || json.donnees?.accessToken;
  if (!token) throw new Error("token manquant");
  return token;
}

async function api(method, path, token, body) {
  const res = await fetch(`${gateway}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.succes === false) {
    throw new Error(`${method} ${path} → ${res.status} ${json?.erreur?.message || JSON.stringify(json)}`);
  }
  return json.donnees ?? json;
}

function estFake(u) {
  if (GARDER_TEL.has(u.telephone)) return false;
  if (u.role === "ADMIN") return false;
  if (GARDER_NOMS.has(String(u.nom || "").trim())) return false;
  // Tél. techniques d'anonymisation uniquement (8991… / 000…)
  if (String(u.telephone || "").startsWith("+2438991")) return true;
  if (String(u.telephone || "").startsWith("+243000")) return true;
  // Fakers EN restants — ne jamais matcher un nom allowlisté
  if (NOM_ANGLAIS.test(String(u.nom || "").trim())) return true;
  return false;
}

async function main() {
  console.log("══ Purge fakes avant test réel ══");
  const token = await login();
  const cibles = [];
  let page = 1;
  for (;;) {
    const data = await api("GET", `/admin/utilisateurs?parPage=100&page=${page}`, token);
    const items = Array.isArray(data) ? data : data.items || [];
    cibles.push(...items.filter(estFake));
    if (items.length < 100) break;
    page += 1;
    if (page > 20) break;
  }

  console.log(`→ ${cibles.length} compte(s) à anonymiser`);
  let ok = 0;
  for (const u of cibles) {
    try {
      await api("DELETE", `/admin/utilisateurs/${u.id}`, token);
      console.log(`  ✓ ${u.role} ${u.nom} ${u.telephone}`);
      ok += 1;
    } catch (e) {
      console.log(`  ✗ ${u.telephone}: ${e.message}`);
    }
  }

  // Re-scan public services
  const services = await api("GET", `/services?parPage=50`, token);
  const items = Array.isArray(services) ? services : services.items || [];
  console.log(`✓ ${ok}/${cibles.length} purgé(s). Services publics restants: ${items.length}`);
  for (const s of items) {
    console.log(`  - ${s.nom} | ${s.prestataire?.nomEntreprise || "?"} | ${s.prestataire?.telephone || ""}`);
  }
}

main().catch((e) => {
  console.error("✗", e.message || e);
  process.exit(1);
});
