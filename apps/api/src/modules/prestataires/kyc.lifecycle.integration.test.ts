/**
 * KYC admin reviser — skip si GATEWAY_URL absent.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { apiFetch } from "../../test/http";

const GATEWAY = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
const ADMIN = process.env.SMOKE_ADMIN_PHONE || "+243900000001";
const PIN = process.env.SMOKE_ADMIN_PIN || "1234";
const run = Boolean(GATEWAY);

const api = (method: string, path: string, body?: unknown, token?: string) =>
  apiFetch(GATEWAY, method, path, body, token);

describe.skipIf(!run)("KYC admin", () => {
  let token = "";

  beforeAll(async () => {
    const auth = await api("POST", "/auth/connexion", { telephone: ADMIN, pin: PIN });
    expect(auth.status).toBeLessThan(400);
    token = auth.data.token || auth.data.accessToken;
  });

  it("liste KYC et demande INFO_MANQUANTE sur un dossier", async () => {
    const liste = await api("GET", "/prestataires/admin/kyc", undefined, token);
    expect(liste.status).toBe(200);
    const items = liste.data.items || liste.data || [];
    if (!Array.isArray(items) || items.length === 0) {
      console.warn("Aucun dossier KYC — skip reviser");
      return;
    }
    const dossier = items.find((d: { kycStatut?: string }) => d.kycStatut === "EN_REVUE") || items[0];
    const prestataireId = dossier.prestataireId || dossier.id;
    const reviser = await api(
      "POST",
      "/prestataires/admin/kyc/reviser",
      {
        prestataireId,
        decision: "INFO_MANQUANTE",
        motif: "vitest — document complémentaire",
        approuverProfil: false,
      },
      token
    );
    expect(reviser.status).toBeLessThan(400);
  });
});
