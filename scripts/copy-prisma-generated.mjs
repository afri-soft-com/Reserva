#!/usr/bin/env node
/** Copie src/generated → dist/generated après tsc (client Prisma custom output). */
import fs from "fs";
import path from "path";

const serviceDir = process.argv[2];
if (!serviceDir) {
  console.error("Usage: node scripts/copy-prisma-generated.mjs <service-dir>");
  process.exit(1);
}

const src = path.join(serviceDir, "src", "generated");
const dest = path.join(serviceDir, "dist", "generated");

if (!fs.existsSync(src)) {
  console.error(`Prisma generated introuvable : ${src} (lancer db:generate d'abord)`);
  process.exit(1);
}

fs.cpSync(src, dest, { recursive: true });
console.log(`OK prisma generated → ${dest}`);
