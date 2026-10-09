import { describe, expect, it } from "vitest";
import {
  cheminPublicWebhook,
  referenceHubPaiement,
  signerAfriSoftHub,
  uuidDepuisCle,
  verifierSignatureWebhookAfriSoft,
} from "./afrisoft-pay.hub";

describe("afrisoft-pay.hub", () => {
  it("signe et vérifie un webhook HMAC", () => {
    const secret = "test-secret";
    const path = "/api/paiements/webhooks/afrisoft";
    const rawBody = JSON.stringify({
      event: "payment.completed",
      payment_id: "pay_demo",
      status: "COMPLETED",
      reference: "reserva_pay_abc",
      amount_cdf: 2500,
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const signature = signerAfriSoftHub(secret, ts, "POST", path, rawBody);
    expect(
      verifierSignatureWebhookAfriSoft({
        secret,
        timestamp: ts,
        method: "POST",
        path,
        rawBody,
        signature,
      })
    ).toBe(true);
  });

  it("rejette une signature périmée", () => {
    const secret = "test-secret";
    const path = "/webhooks/afrisoft-payments";
    const rawBody = "{}";
    const ts = String(Math.floor(Date.now() / 1000) - 400);
    const signature = signerAfriSoftHub(secret, ts, "POST", path, rawBody);
    expect(
      verifierSignatureWebhookAfriSoft({
        secret,
        timestamp: ts,
        method: "POST",
        path,
        rawBody,
        signature,
      })
    ).toBe(false);
  });

  it("produit une référence hub stable et un uuid déterministe", () => {
    const u1 = uuidDepuisCle("pay:idem-1");
    const u2 = uuidDepuisCle("pay:idem-1");
    expect(u1).toBe(u2);
    expect(referenceHubPaiement("Reserva!", "pay", u1)).toBe(`reserva_pay_${u1}`);
  });

  it("normalise le chemin public /api/v1 → /v1", () => {
    expect(cheminPublicWebhook("/api/v1/payments")).toBe("/v1/payments");
    expect(cheminPublicWebhook("/api/paiements/webhooks/afrisoft")).toBe(
      "/api/paiements/webhooks/afrisoft"
    );
  });
});
