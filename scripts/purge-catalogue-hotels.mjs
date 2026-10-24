import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { PrismaClient } = require(path.join(racine, "services/hotels/src/generated/prisma"));

const prisma = new PrismaClient();
await prisma.avisHotel.deleteMany();
await prisma.disponibiliteJour.deleteMany();
await prisma.planTarif.deleteMany();
await prisma.typeChambre.deleteMany();
await prisma.hotel.deleteMany();
console.log("✓ hotels vidé");
await prisma.$disconnect();
