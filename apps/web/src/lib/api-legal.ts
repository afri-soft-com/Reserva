import { clientApi } from "./api-client";
import { ReponseApi } from "@reserva/shared";

export type DocumentPrivacy = {
  slug: "privacy";
  title: string;
  version: string;
  body: string;
  format: string;
  source?: "database" | "fallback";
};

export async function lirePrivacyPublique(): Promise<DocumentPrivacy> {
  const { data } = await clientApi.get<ReponseApi<DocumentPrivacy>>("/legal/privacy");
  return (data.donnees ?? data) as DocumentPrivacy;
}

export async function lirePrivacyAdmin(): Promise<DocumentPrivacy> {
  const { data } = await clientApi.get<ReponseApi<DocumentPrivacy>>("/legal/admin/privacy");
  return (data.donnees ?? data) as DocumentPrivacy;
}

export async function enregistrerPrivacyAdmin(payload: {
  title: string;
  version: string;
  body: string;
  format: string;
}): Promise<DocumentPrivacy> {
  const { data } = await clientApi.put<ReponseApi<DocumentPrivacy>>("/legal/admin/privacy", payload);
  return (data.donnees ?? data) as DocumentPrivacy;
}
