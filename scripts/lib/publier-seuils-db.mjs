#!/usr/bin/env node
/**
 * Écrit les seuils APP_VERSION_* en base (monotone).
 * Env: DATABASE_URL (schema=core), PAYLOAD_JSON
 */
import { PrismaClient } from "@prisma/client";

const payload = JSON.parse(process.env.PAYLOAD_JSON || "{}");
const prisma = new PrismaClient();

function cmpVer(a, b) {
  const parts = (v) =>
    String(v || "0")
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map((n) => parseInt(n, 10));
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function cle(canal, champ) {
  return `APP_VERSION_${canal.toUpperCase()}_${champ}`;
}

async function lireChamp(canal, champ, defaut) {
  const row = await prisma.configurationTarification.findFirst({
    where: { cle: cle(canal, champ), actif: true },
  });
  return row?.valeur || defaut;
}

async function upsert(canal, champ, valeur, description) {
  const k = cle(canal, champ);
  await prisma.configurationTarification.upsert({
    where: { cle: k },
    create: {
      cle: k,
      valeur: String(valeur),
      description,
      type: "TEXTE",
      actif: true,
    },
    update: { valeur: String(valeur), actif: true },
  });
}

async function main() {
  const mods = [];
  for (const canal of Object.keys(payload)) {
    const dem = payload[canal];
    if (!dem?.minSoft) continue;
    let soft = await lireChamp(canal, "minSoft", "0.0.0");
    let force = await lireChamp(canal, "minForce", "0.0.0");
    if (cmpVer(dem.minSoft, soft) > 0) {
      if (cmpVer(soft, force) > 0) force = soft;
      mods.push(`${canal}.minSoft ${soft} → ${dem.minSoft}`);
      soft = dem.minSoft;
    }
    if (dem.minForce && cmpVer(dem.minForce, force) > 0) {
      mods.push(`${canal}.minForce ${force} → ${dem.minForce}`);
      force = dem.minForce;
    }
    if (cmpVer(force, soft) > 0) {
      mods.push(`${canal}.minSoft aligné sur minForce → ${force}`);
      soft = force;
    }
    await upsert(canal, "minSoft", soft, `Version soft ${canal}`);
    await upsert(canal, "minForce", force, `Version force ${canal}`);
    // Ne jamais toucher / vider les URLs store depuis la sync CI.
  }
  console.log(JSON.stringify({ modifications: mods }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
