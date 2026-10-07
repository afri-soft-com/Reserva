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

export async function listerAuditsAdmin(page = 1, parPage = 30) {
  const skip = (page - 1) * parPage;
  const [items, total] = await Promise.all([
    prisma.auditAdmin.findMany({
      skip,
      take: parPage,
      orderBy: { creeLe: "desc" },
    }),
    prisma.auditAdmin.count(),
  ]);
  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) || 1 };
}
