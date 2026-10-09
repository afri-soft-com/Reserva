/**
 * Tests d'intégration API (HTTP) — nécessitent GATEWAY_URL.
 * Skippés automatiquement si GATEWAY_URL absent.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { apiFetch } from "../../test/http";

const GATEWAY = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
const PHONE = process.env.SMOKE_ADMIN_PHONE || "+243900000001";
const PIN = process.env.SMOKE_ADMIN_PIN || "1234";
const run = Boolean(GATEWAY);

const api = (method: string, path: string, body?: unknown, token?: string) =>
  apiFetch(GATEWAY, method, path, body, token);

describe.skipIf(!run)("intégration API gateway", () => {
  let token = "";

  beforeAll(async () => {
    const { status, data } = await api("POST", "/auth/connexion", { telephone: PHONE, pin: PIN });
    expect(status).toBeLessThan(400);
    token = String(data.token || data.accessToken || "");
    expect(token).toBeTruthy();
  });

  it("GET /sante opérationnel", async () => {
    const { status, data } = await api("GET", "/sante");
    expect(status).toBe(200);
    expect(data.statut || data.base).toBeTruthy();
  });

  it("profil admin authentifié", async () => {
    const { status, data } = await api("GET", "/auth/profil", undefined, token);
    expect(status).toBe(200);
    expect(data.role).toBeTruthy();
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
    const sim = await api("GET", "/economie/simulation?prix=10000&devise=CDF", undefined, token);
    expect(sim.status).toBe(200);
    expect(sim.json.succes !== false).toBe(true);
  });
});

