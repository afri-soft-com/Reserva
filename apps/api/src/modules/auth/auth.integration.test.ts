/**
 * Tests d'intégration API (HTTP) — nécessitent GATEWAY_URL ou API locale démarrée.
 * Skippés automatiquement si GATEWAY_URL absent (unitaires CI quality).
 */
import { describe, it, expect, beforeAll } from "vitest";

const GATEWAY = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
const PHONE = process.env.SMOKE_ADMIN_PHONE || "+243900000001";
const PIN = process.env.SMOKE_ADMIN_PIN || "1234";
const run = Boolean(GATEWAY);

async function api(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

describe.skipIf(!run)("intégration API gateway", () => {
  let token = "";

  beforeAll(async () => {
    const { status, json } = await api("POST", "/auth/connexion", { telephone: PHONE, pin: PIN });
    expect(status).toBeLessThan(400);
    token = json.donnees?.token || json.donnees?.accessToken || json.token;
    expect(token).toBeTruthy();
  });

  it("GET /sante opérationnel", async () => {
    const { status, json } = await api("GET", "/sante");
    expect(status).toBe(200);
    const d = json.donnees || json;
    expect(d.statut || d.base).toBeTruthy();
  });

  it("profil admin authentifié", async () => {
    const { status, json } = await api("GET", "/auth/profil", undefined, token);
    expect(status).toBe(200);
    expect(json.donnees?.role || json.role).toBeTruthy();
  });

  it("pilotage + réservations admin", async () => {
    const pilotage = await api("GET", "/admin/pilotage", undefined, token);
    expect(pilotage.status).toBe(200);
    const resas = await api("GET", "/admin/reservations", undefined, token);
    expect(resas.status).toBe(200);
  });

  it("KYC admin + finances", async () => {
    const kyc = await api("GET", "/prestataires/admin/kyc", undefined, token);
    expect(kyc.status).toBe(200);
    const fin = await api("GET", "/economie/admin/finances?periode=mois", undefined, token);
    expect(fin.status).toBe(200);
  });

  it("catalogues hotels + transport + simulation paiement", async () => {
    const hotels = await api("GET", "/hotels", undefined, token);
    expect(hotels.status).toBe(200);
    const villes = await api("GET", "/transport/villes", undefined, token);
    expect(villes.status).toBe(200);
    const sim = await api("GET", "/economie/simulation?montant=10000&devise=CDF", undefined, token);
    expect(sim.status).toBe(200);
    expect(sim.json.succes !== false).toBe(true);
  });
});
