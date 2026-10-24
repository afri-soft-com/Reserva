#!/usr/bin/env node
/**
 * Purge les données de démo / seed en production pour tester avec du réel.
 *
 * - Suspend les prestataires seed connus + profils faker (noms anglo EN_ATTENTE)
 * - Soft-delete les comptes seed (téléphones +24397… / clients démo)
 * - Vide les catalogues hotels + transport (seed Unsplash)
 *
 * Env: GATEWAY_URL, SMOKE_ADMIN_PHONE, SMOKE_ADMIN_PIN, RENDER_API_KEY
 * Opt: KEEP_SEED_ACCOUNTS=1 pour ne pas soft-delete les téléphones seed
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const gateway = (process.env.GATEWAY_URL || "https://reserva-gateway.onrender.com/api").replace(/\/$/, "");
const phone = process.env.SMOKE_ADMIN_PHONE || "+243900000001";
const pin = process.env.SMOKE_ADMIN_PIN || "1234";
const keepSeedAccounts = process.env.KEEP_SEED_ACCOUNTS === "1";
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.render.com/v1";

const SEED_PHONES = [
  "+243970000001",
  "+243970000002",
  "+243970000003",
  "+243970000004",
  "+243970000005",
  "+243991234567",
  "+243981234568",
];

const SEED_ENTREPRISES = new Set([
  "Clinique Bonne Santé",
  "Trans-Congo Voyages",
  "Hôtel Fleuve Congo",
]);

/** Prestataires réels à préserver (noms connus). */
const GARDER_NOMS = new Set([
  "Celestin Kasereka",
  "afriri",
  "mar",
  "Cls",
  "Clinique Espoir",
]);

const NOM_ANGLAIS = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/;

async function login() {
  const res = await fetch(`${gateway}/auth/connexion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telephone: phone, pin }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.succes === false) {
    throw new Error(`login admin → ${res.status} ${json?.erreur?.message || ""}`);
  }
  const token = json.donnees?.token || json.donnees?.accessToken;
  if (!token) throw new Error("token admin manquant");
  return token;
}

async function api(method, pathUrl, token, body) {
  const res = await fetch(`${gateway}${pathUrl}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.succes === false) {
    const msg = json?.erreur?.message || JSON.stringify(json);
    throw new Error(`${method} ${pathUrl} → ${res.status} ${msg}`);
  }
  return json.donnees ?? json;
}

async function listerPrestataires(token) {
  const out = [];
  let page = 1;
  for (;;) {
    const data = await api("GET", `/admin/prestataires?parPage=100&page=${page}`, token);
    const items = Array.isArray(data) ? data : data.items || [];
    out.push(...items);
    if (items.length < 100) break;
    page += 1;
    if (page > 20) break;
  }
  return out;
}

function estMockPrestataire(p) {
  const nom = String(p.nomEntreprise || "").trim();
  if (!nom) return false;
  if (GARDER_NOMS.has(nom)) return false;
  if (SEED_ENTREPRISES.has(nom)) return true;
  // Faker anglo typique (Keith Bush, Bill George…) — surtout hôtellerie en attente
  if (NOM_ANGLAIS.test(nom) && (p.statut === "EN_ATTENTE_VALIDATION" || p.categorie === "HOTELLERIE")) {
    return true;
  }
  return false;
}

async function chercherUserId(token, telephone) {
  const q = encodeURIComponent(telephone);
  const data = await api("GET", `/admin/utilisateurs?parPage=20&recherche=${q}`, token);
  const items = Array.isArray(data) ? data : data.items || [];
  const digits = telephone.replace(/\D/g, "");
  const u = items.find((x) => String(x.telephone || "").replace(/\D/g, "") === digits) || items[0];
  return u?.id || null;
}

async function postgresUrl() {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error("RENDER_API_KEY requis pour vider hotels/transport");
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  const list = await fetch(`${API}/postgres?limit=50`, { headers }).then((r) => r.json());
  const arr = Array.isArray(list) ? list : [];
  const hit = arr.find((x) => (x.postgres || x).name === "reserva-db");
  const id = (hit?.postgres || hit)?.id;
  if (!id) throw new Error("Postgres reserva-db introuvable");
  const info = await fetch(`${API}/postgres/${id}/connection-info`, { headers }).then((r) => r.json());
  if (!info.externalConnectionString) throw new Error("externalConnectionString manquant");
  return info.externalConnectionString;
}

function run(cmd, args, env) {
  const r = spawnSync(cmd, args, {
    cwd: racine,
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: true,
    stdio: "inherit",
  });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} → exit ${r.status}`);
}

async function viderViaSeedVide() {
  const base = await postgresUrl();
  run("npx", ["prisma", "generate", "--schema=services/hotels/prisma/schema.prisma"], {});
  run("npx", ["prisma", "generate", "--schema=services/transport/prisma/schema.prisma"], {});
  run("node", ["scripts/purge-catalogue-hotels.mjs"], { DATABASE_URL: `${base}?schema=hotels` });
  run("node", ["scripts/purge-catalogue-transport.mjs"], { DATABASE_URL: `${base}?schema=transport` });
}

async function main() {
  console.log("══ Purge mocks prod ══");
  const token = await login();

  console.log("→ Prestataires");
  const prestas = await listerPrestataires(token);
  let suspendus = 0;
  for (const p of prestas) {
    if (!estMockPrestataire(p)) continue;
    if (p.statut === "SUSPENDU") continue;
    try {
      await api("POST", `/admin/prestataires/${p.id}/suspendre`, token);
      console.log(`  suspendu: ${p.nomEntreprise} (${p.statut})`);
      suspendus += 1;
    } catch (e) {
      console.log(`  ⚠ ${p.nomEntreprise}: ${e.message}`);
    }
  }
  console.log(`✓ ${suspendus} prestataire(s) suspendu(s)`);

  if (!keepSeedAccounts) {
    console.log("→ Comptes seed (soft-delete)");
    let suppr = 0;
    for (const tel of SEED_PHONES) {
      try {
        const id = await chercherUserId(token, tel);
        if (!id) {
          console.log(`  skip ${tel} (introuvable)`);
          continue;
        }
        await api("DELETE", `/admin/utilisateurs/${id}`, token);
        console.log(`  soft-delete ${tel}`);
        suppr += 1;
      } catch (e) {
        console.log(`  ⚠ ${tel}: ${e.message}`);
      }
    }
    console.log(`✓ ${suppr} compte(s) seed anonymisé(s)`);
  } else {
    console.log("→ KEEP_SEED_ACCOUNTS=1 — comptes seed conservés");
  }

  console.log("→ Catalogues hotels / transport");
  await viderViaSeedVide();

  // Vérif services encore visibles
  const clientLogin = await fetch(`${gateway}/auth/connexion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telephone: phone, pin }),
  }).then((r) => r.json());
  const adminTok = clientLogin.donnees?.token;
  const services = await fetch(`${gateway}/services?parPage=50`, {
    headers: { Authorization: `Bearer ${adminTok}` },
  }).then((r) => r.json());
  const items = services.donnees?.items || services.donnees || [];
  console.log(`→ Services encore listés: ${Array.isArray(items) ? items.length : "?"}`);
  if (Array.isArray(items)) {
    for (const s of items.slice(0, 15)) {
      console.log(`   - ${s.nom || s.titre}`);
    }
  }

  const hotels = await fetch(`${gateway}/hotels?ville=Kinshasa&arrivee=2026-11-01&depart=2026-11-03&adultes=2`).then((r) =>
    r.json()
  );
  console.log(`→ Hotels Kinshasa: ${hotels.donnees?.total ?? hotels.donnees?.items?.length ?? "?"}`);

  console.log("✓ Purge terminée");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
