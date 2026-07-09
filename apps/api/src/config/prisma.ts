import { PrismaClient } from "@prisma/client";

// Singleton du client Prisma pour éviter d'épuiser les connexions
// en environnement de développement (hot-reload).
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = global.prismaGlobal ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}
