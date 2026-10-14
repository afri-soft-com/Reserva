import { prisma } from "../../config/prisma";

export async function enregistrerAuditAdmin(input: {
  adminId: string;
  action: string;
  cibleType?: string;
  cibleId?: string;
  details?: string | Record<string, unknown>;
}) {
  return prisma.auditAdmin.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      cibleType: input.cibleType,
      cibleId: input.cibleId,
      details: typeof input.details === "string"
        ? input.details
        : input.details
          ? JSON.stringify(input.details)
          : undefined,
    },
  });
}

export async function listerAuditsAdmin(
  page = 1,
  parPage = 30,
  filtres?: { recherche?: string; action?: string }
) {
  const skip = (page - 1) * parPage;
  const where: Record<string, unknown> = {};
  if (filtres?.action?.trim()) {
    where.action = { contains: filtres.action.trim(), mode: "insensitive" };
  }
  const q = filtres?.recherche?.trim();
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { cibleType: { contains: q, mode: "insensitive" } },
      { cibleId: { contains: q, mode: "insensitive" } },
      { details: { contains: q, mode: "insensitive" } },
      { adminId: { contains: q, mode: "insensitive" } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.auditAdmin.findMany({
      where,
      skip,
      take: parPage,
      orderBy: { creeLe: "desc" },
    }),
    prisma.auditAdmin.count({ where }),
  ]);
  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) || 1 };
}
