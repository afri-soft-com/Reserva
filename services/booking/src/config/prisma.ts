import { PrismaClient } from "../generated/prisma";

const g = globalThis as unknown as { prismaBooking?: PrismaClient };

export const prisma = g.prismaBooking ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") g.prismaBooking = prisma;
