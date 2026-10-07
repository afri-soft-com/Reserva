import { clientApi } from "./api-client";

export async function listerLitiges() {
  const { data } = await clientApi.get("/innovations/litiges");
  return data.data ?? data;
}

export async function trancheLitige(input: {
  litigeId: string;
  decision: "AVOIR_TOTAL" | "AVOIR_PARTIEL" | "REJET" | "REBOOK";
  montantAvoir?: number;
  commentaire?: string;
}) {
  const { data } = await clientApi.post("/innovations/litiges/trancher", input);
  return data.data ?? data;
}

export async function activerAgent(utilisateurId: string, commissionPourcent = 2) {
  const { data } = await clientApi.post("/innovations/agents/activer", {
    utilisateurId,
    commissionPourcent,
  });
  return data.data ?? data;
}

export async function recalculerConfiance() {
  const { data } = await clientApi.post("/innovations/confiance/recalculer", {});
  return data.data ?? data;
}
