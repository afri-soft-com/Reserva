#!/usr/bin/env node
/**
 * prisma migrate deploy pour un service, avec bootstrap baseline si DB déjà créée via db push.
 *
 * Usage: node scripts/db-migrate-service.mjs <core|hotels|booking|transport>
 * Env: DATABASE_URL (ou DATABASE_URL_*), MIGRATE_FALLBACK_PUSH=1 pour fallback db push
 */
import { spawnSync } from "node:child_process";
import path from "path";
import { fileURLToPath } from "url";

const service = process.argv[2];
const schemas = {
  core: "apps/api/prisma/schema.prisma",
  hotels: "services/hotels/prisma/schema.prisma",
  booking: "services/booking/prisma/schema.prisma",
  transport: "services/transport/prisma/schema.prisma",
};
const envKeys = {
  core: ["DATABASE_URL_CORE", "DATABASE_URL"],
  hotels: ["DATABASE_URL_HOTELS", "DATABASE_URL"],
  booking: ["DATABASE_URL_BOOKING", "DATABASE_URL"],
  transport: ["DATABASE_URL_TRANSPORT", "DATABASE_URL"],
};
const BASELINE = "20261009090000_baseline";

if (!service || !schemas[service]) {
  console.error("Usage: node scripts/db-migrate-service.mjs <core|hotels|booking|transport>");
  process.exit(1);
}

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = path.join(racine, schemas[service]);

let url;
for (const k of envKeys[service]) {
  if (process.env[k]) {
    url = process.env[k];
    break;
  }
}
if (!url) {
  console.error(`DATABASE_URL manquante pour ${service}`);
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: url };

function run(args) {
  return spawnSync("npx", ["prisma", ...args, `--schema=${schema}`], {
    cwd: racine,
    env,
    encoding: "utf8",
    shell: true,
  });
}

function logResult(label, result) {
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  console.log(`${label} → exit ${result.status}`);
  return result.status === 0;
}

console.log(`→ migrate deploy ${service}`);
let ok = logResult("deploy", run(["migrate", "deploy"]));

if (!ok) {
  console.log(`→ tentative resolve baseline ${BASELINE} (DB déjà peuplée via db push ?)`);
  logResult("resolve", run(["migrate", "resolve", "--applied", BASELINE]));
  ok = logResult("deploy-retry", run(["migrate", "deploy"]));
}

if (!ok && process.env.MIGRATE_FALLBACK_PUSH === "1") {
  console.warn(`⚠ migrate échoué — fallback db push (${service})`);
  ok = logResult("db-push", run(["db", "push", "--skip-generate", "--accept-data-loss"]));
}

if (!ok) {
  console.error(`Échec migration ${service}`);
  process.exit(1);
}
console.log(`✓ migrate OK ${service}`);
