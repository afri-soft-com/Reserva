import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../config/env";
import { initierPaiementMobileMoney, montantVersCdf } from "./mobilemoney.adapter";

vi.mock("../economie/economie.service", () => ({
  obtenirConfigTarif: vi.fn(async () => ({ tauxUsdCdf: 2800 })),
}));

describe("mobilemoney.adapter", () => {
  const modeAvant = env.MODE_PAIEMENT;

  beforeEach(() => {
    env.MODE_PAIEMENT = "simulation";
    process.env.PAIEMENT_SIM_DETERMINISTE = "1";
  });

  afterEach(() => {
    env.MODE_PAIEMENT = modeAvant;
  });

  it("montantVersCdf : CDF arrondi, USD via taux", async () => {
    expect(await montantVersCdf(1500.4, "CDF")).toBe(1500);
    expect(await montantVersCdf(10, "USD")).toBe(28000);
  });

  it("montantVersCdf refuse une devise inconnue", async () => {
    await expect(montantVersCdf(100, "EUR")).rejects.toThrow(/Devise non supportée/);
  });

  it("simulation : succès déterministe en CI", async () => {
    const r = await initierPaiementMobileMoney({
      operateur: "MPESA",
      telephonePaiement: "+243970000001",
      montant: 5000,
    });
    expect(r.succes).toBe(true);
    expect(r.statut).toBe("PAYE");
    expect(r.referenceExterne).toMatch(/^SIM-MPESA-/);
  });

  it("espèces : pas d'appel hub", async () => {
    const r = await initierPaiementMobileMoney({
      operateur: "ESPECES",
      telephonePaiement: "",
      montant: 1000,
    });
    expect(r.succes).toBe(true);
    expect(r.statut).toBe("EN_ATTENTE");
    expect(r.referenceExterne).toMatch(/^ESP-/);
  });

  it("production : refuse sous le plancher 500 FC", async () => {
    env.MODE_PAIEMENT = "production";
    const r = await initierPaiementMobileMoney({
      operateur: "MPESA",
      telephonePaiement: "+243970000001",
      montant: 100,
      devise: "CDF",
    });
    expect(r.succes).toBe(false);
    expect(r.statut).toBe("ECHOUE");
    expect(r.messageOperateur).toMatch(/500 FC/);
  });

  it("production : refuse sans numéro Mobile Money", async () => {
    env.MODE_PAIEMENT = "production";
    const r = await initierPaiementMobileMoney({
      operateur: "AIRTEL_MONEY",
      telephonePaiement: "  ",
      montant: 2000,
    });
    expect(r.succes).toBe(false);
    expect(r.messageOperateur).toMatch(/Numéro Mobile Money/);
  });
});
