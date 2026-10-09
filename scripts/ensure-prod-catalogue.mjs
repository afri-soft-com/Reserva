#!/usr/bin/env node
/**
 * Si le catalogue prod est vide (hotels / transport), seed via l'URL externe Render Postgres.
 * Env: RENDER_API_KEY, GATEWAY_URL (optionnel), RENDER_POSTGRES_ID (défaut: découverte reserva-db)
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.render.com/v1";
const key = process.env.RENDER_API_KEY;
const gateway = (process.env.GATEWAY_URL || "https://reserva-gateway.onrender.com/api").replace(/\/$/, "");
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!key) {
  console.error("RENDER_API_KEY manquant — skip ensure catalogue");
  process.exit(0);
}

const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };

async function catalogueVide() {
  const arrivee = new Date();
  arrivee.setDate(arrivee.getDate() + 5);
  const depart = new Date(arrivee);
  depart.setDate(depart.getDate() + 2);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const url = `${gateway}/hotels?ville=Kinshasa&arrivee=${fmt(arrivee)}&depart=${fmt(depart)}&adultes=2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET hotels → ${res.status}`);
  const body = await res.json();
  const total = body?.donnees?.total ?? body?.donnees?.items?.length ?? 0;
  return Number(total) === 0;
}

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

async function main() {
  console.log("→ Contrôle catalogue prod");
  const vide = await catalogueVide();
  if (!vide) {
    console.log("✓ Catalogue hotels déjà peuplé — skip seed");
    return;
  }
  console.log("⚠ Catalogue vide — seed hotels + transport via Postgres externe");
  const id = await postgresId();
  const base = await externalUrl(id);

  run("npx", ["prisma", "generate", "--schema=services/hotels/prisma/schema.prisma"], {});
  run("npx", ["prisma", "generate", "--schema=services/transport/prisma/schema.prisma"], {});
  run("npm", ["run", "db:seed:hotels"], {
    DATABASE_URL: `${base}?schema=hotels`,
  });
  run("npm", ["run", "db:seed:transport"], {
    DATABASE_URL: `${base}?schema=transport`,
  });

  const encoreVide = await catalogueVide();
  if (encoreVide) throw new Error("Seed exécuté mais catalogue hotels toujours vide");
  console.log("✓ Catalogue prod prêt");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
