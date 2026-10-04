import { PrismaClient } from "../generated/prisma";

const g = globalThis as unknown as { prismaTransport?: PrismaClient };

export const prisma = g.prismaTransport ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") g.prismaTransport = prisma;
