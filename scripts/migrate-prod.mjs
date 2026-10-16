#!/usr/bin/env node
/**
 * Applique prisma migrate deploy sur la Postgres Render (externe).
 * Nécessaire car le start Render ne lance plus les migrations (disque masque prisma/).
 *
 * Env: RENDER_API_KEY, RENDER_POSTGRES_ID (optionnel)
 * Usage: node scripts/migrate-prod.mjs [core|hotels|booking|transport|all]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.render.com/v1";
const key = process.env.RENDER_API_KEY;
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cible = (process.argv[2] || "all").toLowerCase();
const services = ["core", "hotels", "booking", "transport"];

if (!key) {
  console.error("RENDER_API_KEY manquant");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };

async function postgresId() {
  if (process.env.RENDER_POSTGRES_ID) return process.env.RENDER_POSTGRES_ID;
  const res = await fetch(`${API}/postgres?limit=50`, { headers });
  if (!res.ok) throw new Error(`list postgres → ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : [];
  const hit = list.find((x) => {
    const p = x.postgres || x;
    return p.name === "reserva-db";
  });
  const p = hit?.postgres || hit;
  if (!p?.id) throw new Error("Postgres reserva-db introuvable");
  return p.id;
}

async function externalUrl(id) {
  const res = await fetch(`${API}/postgres/${id}/connection-info`, { headers });
  if (!res.ok) throw new Error(`connection-info → ${res.status}`);
  const info = await res.json();
  if (!info.externalConnectionString) throw new Error("externalConnectionString manquant");
  return info.externalConnectionString;
}

function withSchema(base, schema) {
  const u = new URL(base);
  u.searchParams.set("schema", schema);
  return u.toString();
}

function runMigrate(service, databaseUrl) {
  console.log(`→ migrate prod ${service}`);
  const r = spawnSync("node", ["scripts/db-migrate-service.mjs", service], {
    cwd: racine,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      MIGRATE_FALLBACK_PUSH: process.env.MIGRATE_FALLBACK_PUSH || "1",
    },
    encoding: "utf8",
    shell: true,
    stdio: "inherit",
  });
  if (r.status !== 0) throw new Error(`migrate ${service} → exit ${r.status}`);
}

async function main() {
  const aMigrer = cible === "all" ? services : [cible];
  if (!aMigrer.every((s) => services.includes(s))) {
    throw new Error(`Service invalide: ${cible}`);
  }

  const id = await postgresId();
  const base = await externalUrl(id);
  console.log(`✓ Postgres ${id} — migration ${aMigrer.join(", ")}`);

  for (const service of aMigrer) {
    runMigrate(service, withSchema(base, service));
  }
  console.log("✓ Migrations prod appliquées");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
