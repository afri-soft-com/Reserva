import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { PrismaClient } = require(path.join(racine, "services/transport/src/generated/prisma"));

const prisma = new PrismaClient();
await prisma.trajet.deleteMany();
await prisma.ligne.deleteMany();
await prisma.operateur.deleteMany();
console.log("✓ transport vidé");
await prisma.$disconnect();
