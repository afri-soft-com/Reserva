import { clientApi } from "./api-client";

export async function listerAgents() {
  const { data } = await clientApi.get("/innovations/agents");
  return data.data ?? data;
}

export async function activerAgent(utilisateurId: string, commissionPourcent?: number) {
  const { data } = await clientApi.post("/innovations/agents/activer", {
    utilisateurId,
    ...(commissionPourcent != null ? { commissionPourcent } : {}),
  });
  return data.data ?? data;
}

export async function modifierCommissionAgent(id: string, commissionPourcent: number) {
  const { data } = await clientApi.patch(`/innovations/agents/${id}/commission`, {
    commissionPourcent,
  });
  return data.data ?? data;
}

export async function desactiverAgent(id: string) {
  const { data } = await clientApi.post(`/innovations/agents/${id}/desactiver`, {});
  return data.data ?? data;
}
