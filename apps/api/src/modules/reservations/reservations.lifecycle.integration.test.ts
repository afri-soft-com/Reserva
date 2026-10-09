/**
 * Cycle métier réservation (écriture) — skip si GATEWAY_URL absent.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { apiFetch } from "../../test/http";

const GATEWAY = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
const PIN = process.env.SMOKE_ADMIN_PIN || "1234";
const CLIENT = process.env.SMOKE_CLIENT_PHONE || "+243991234567";
const PRO = process.env.SMOKE_PRO_PHONE || "+243970000001";
const run = Boolean(GATEWAY);

const api = (method: string, path: string, body?: unknown, token?: string) =>
  apiFetch(GATEWAY, method, path, body, token);

async function login(telephone: string) {
  const { status, data } = await api("POST", "/auth/connexion", { telephone, pin: PIN });
  expect(status).toBeLessThan(400);
  const token = data.token || data.accessToken;
  expect(token).toBeTruthy();
  return token as string;
}

describe.skipIf(!run)("cycle réservation → paiement → annulation", () => {
  let clientToken = "";
  let proToken = "";
  let reservationId = "";

  beforeAll(async () => {
    clientToken = await login(CLIENT);
    proToken = await login(PRO);
  });

  it("crée, accepte, paie (sim) et annule une réservation", async () => {
    const search = await api("GET", "/services?categorie=SANTE&parPage=10", undefined, clientToken);
    expect(search.status).toBe(200);
    const services = search.data.items || search.data || [];
    const service = (Array.isArray(services) ? services : []).find(
      (s: { creneaux?: unknown[] }) => (s.creneaux || []).length > 0
    );
    expect(service?.id).toBeTruthy();
    const creneau = service.creneaux[0];
    expect(creneau?.id).toBeTruthy();

    const created = await api(
      "POST",
      "/reservations",
      {
        serviceId: service.id,
        creneauId: creneau.id,
        notes: "vitest lifecycle",
        acomptePourcent: 30,
      },
      clientToken
    );
    expect(created.status).toBeLessThan(400);
    reservationId = created.data.id;
    expect(reservationId).toBeTruthy();
    expect(created.data.statut).toBe("EN_ATTENTE");

    const accept = await api("POST", `/reservations/${reservationId}/repondre`, { accepter: true }, proToken);
    expect(accept.status).toBeLessThan(400);
    expect(accept.data.statut).toBe("CONFIRMEE");

    const montant = created.data.montantAcompte || created.data.montantTotal || service.prix || 15000;
    const pay = await api(
      "POST",
      "/paiements",
      {
        reservationId,
        operateur: "MPESA",
        telephonePaiement: CLIENT,
        montant: Number(montant),
        acompteUniquement: true,
        idempotencyKey: `vitest-pay-${Date.now()}`,
      },
      clientToken
    );
    expect(pay.status).toBeLessThan(400);

    const cancel = await api(
      "POST",
      "/reservations/annuler",
      { reservationId, motif: "vitest", modeRemboursement: "AVOIR" },
      clientToken
    );
    expect(cancel.status).toBeLessThan(400);
    expect(cancel.data.statut).toBe("ANNULEE");
  });
});
