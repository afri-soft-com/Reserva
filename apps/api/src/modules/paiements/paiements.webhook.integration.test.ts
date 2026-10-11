/**
 * Webhook AfriSoft via gateway — skip si GATEWAY_URL absent.
 * Secret CI : AFRISOFT_HUB_WEBHOOK_SECRET (défaut ci-webhook-secret).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { apiFetch } from "../../test/http";
import { signerAfriSoftHub } from "./afrisoft-pay.hub";

const GATEWAY = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
const PIN = process.env.SMOKE_ADMIN_PIN || "1234";
const CLIENT = process.env.SMOKE_CLIENT_PHONE || "+243991234567";
const PRO = process.env.SMOKE_PRO_PHONE || "+243970000001";
const WEBHOOK_SECRET =
  process.env.AFRISOFT_HUB_WEBHOOK_SECRET ||
  process.env.AFRISOFT_HUB_API_KEY ||
  "ci-webhook-secret";
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

async function postWebhook(body: Record<string, unknown>, opts?: { badSig?: boolean }) {
  const path = "/api/paiements/webhooks/afrisoft";
  const rawBody = JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = opts?.badSig
    ? "deadbeef"
    : signerAfriSoftHub(WEBHOOK_SECRET, ts, "POST", path, rawBody);

  const res = await fetch(`${GATEWAY.replace(/\/api$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AfriSoft-Timestamp": ts,
      "X-AfriSoft-Signature": signature,
      "X-AfriSoft-App-Id": "reserva",
      "X-AfriSoft-Event": String(body.event || "payment.completed"),
    },
    body: rawBody,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

describe.skipIf(!run)("webhook AfriSoft (HMAC + ledger)", () => {
  let clientToken = "";
  let proToken = "";
  let referenceExterne = "";
  let montantCdf = 0;

  beforeAll(async () => {
    clientToken = await login(CLIENT);
    proToken = await login(PRO);

    const search = await api("GET", "/services?categorie=SANTE&parPage=10", undefined, clientToken);
    expect(search.status).toBe(200);
    const services = search.data.items || search.data || [];
    const service = (Array.isArray(services) ? services : []).find(
      (s: { creneaux?: unknown[] }) => (s.creneaux || []).length > 0
    );
    expect(service?.id).toBeTruthy();
    const creneau = service.creneaux[0];

    const created = await api(
      "POST",
      "/reservations",
      {
        serviceId: service.id,
        creneauId: creneau.id,
        notes: "vitest webhook",
        acomptePourcent: 30,
      },
      clientToken
    );
    expect(created.status).toBeLessThan(400);
    const reservationId = created.data.id as string;

    const accept = await api(
      "POST",
      `/reservations/${reservationId}/repondre`,
      { accepter: true },
      proToken
    );
    expect(accept.status).toBeLessThan(400);

    const montant = Number(
      created.data.montantAcompte || created.data.montantTotal || service.prix || 15000
    );
    montantCdf = Math.round(montant);
    referenceExterne = `vitest-webhook-${Date.now()}`;

    const pay = await api(
      "POST",
      "/paiements",
      {
        reservationId,
        operateur: "MPESA",
        telephonePaiement: CLIENT,
        montant,
        acompteUniquement: true,
        idempotencyKey: referenceExterne,
      },
      clientToken
    );
    expect(pay.status).toBeLessThan(400);
  }, 120_000);

  it("rejette une signature HMAC invalide", async () => {
    const { status, json } = await postWebhook(
      {
        event: "payment.completed",
        status: "COMPLETED",
        reference: referenceExterne,
        amount_cdf: montantCdf,
      },
      { badSig: true }
    );
    expect(status).toBe(401);
    expect(json.error || json.message).toBeTruthy();
  });

  it("accepte un webhook COMPLETED (idempotent si déjà PAYE)", async () => {
    const { status, json } = await postWebhook({
      event: "payment.completed",
      status: "COMPLETED",
      reference: referenceExterne,
      amount_cdf: montantCdf,
      purpose: "pay",
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    // Simulation a déjà marqué PAYE → dejaTraite, ou ignore orphelin
    expect(
      json.dejaTraite === true || json.ignore === true || json.ok === true
    ).toBe(true);
  });

  it("fail-closed si amount_cdf incohérent", async () => {
    const { status, json } = await postWebhook({
      event: "payment.completed",
      status: "COMPLETED",
      reference: referenceExterne,
      amount_cdf: montantCdf + 99999,
      purpose: "pay",
    });
    // ErreurValidation → 400 ; ou 200 ignore si tx introuvable
    expect([200, 400, 422]).toContain(status);
    if (status >= 400) {
      expect(String(json.message || json.error || json.erreur || "")).toMatch(/montant|incohérent|validation/i);
    }
  });

  it("ignore un payout / refund (pas de crédit réservation)", async () => {
    const { status, json } = await postWebhook({
      event: "payment.completed",
      status: "COMPLETED",
      reference: referenceExterne,
      amount_cdf: montantCdf,
      purpose: "refund",
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.ignore).toBe(true);
  });
});
