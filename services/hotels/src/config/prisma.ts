import { PrismaClient } from "../generated/prisma";

const globalPourPrisma = globalThis as unknown as { prismaHotels?: PrismaClient };

export const prisma = globalPourPrisma.prismaHotels ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  globalPourPrisma.prismaHotels = prisma;
}
