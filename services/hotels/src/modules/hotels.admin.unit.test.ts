import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  hotel: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  typeChambre: { findFirst: vi.fn(), create: vi.fn() },
  planTarif: { create: vi.fn(), update: vi.fn() },
}));
vi.mock("../config/prisma", () => ({ prisma }));

import { creerHotelAdmin, modifierHotelAdmin, retirerHotelAdmin } from "./hotels.service";

beforeEach(() => {
  vi.clearAllMocks();
  prisma.hotel.create.mockImplementation(async ({ data }) => ({ id: "hotel-1", ...data }));
  prisma.hotel.findUnique.mockResolvedValue({ id: "hotel-1", actif: true });
  prisma.hotel.update.mockImplementation(async ({ data }) => ({ id: "hotel-1", ...data }));
});

describe("creerHotelAdmin", () => {
  it("nettoie les champs et borne les étoiles entre 1 et 5", async () => {
    const hotel = await creerHotelAdmin({ nom: "  Fleuve  ", ville: "Kinshasa", quartier: "Gombe", etoiles: 9 });
    expect(hotel).toMatchObject({ nom: "Fleuve", etoiles: 5, adresse: null });
  });

  it("refuse un hôtel sans quartier", async () => {
    await expect(creerHotelAdmin({ nom: "Fleuve", ville: "Kinshasa", quartier: "" })).rejects.toThrow(/requis/);
    expect(prisma.hotel.create).not.toHaveBeenCalled();
  });

  it("crée une chambre standard avec le prix saisi", async () => {
    prisma.typeChambre.findFirst.mockResolvedValue(null);
    await creerHotelAdmin({ nom: "Fleuve", ville: "Kinshasa", quartier: "Gombe", prixParNuit: 80, devise: "usd" });
    expect(prisma.typeChambre.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tarifs: { create: { nom: "Standard", prixParNuit: 80, devise: "USD" } } }),
      }),
    );
  });
});

describe("modifierHotelAdmin", () => {
  it("garde la devise du tarif quand seul le prix change", async () => {
    prisma.typeChambre.findFirst.mockResolvedValue({ id: "ch-1", tarifs: [{ id: "t-1", devise: "CDF" }] });
    await modifierHotelAdmin("hotel-1", { prixParNuit: 150000 });
    expect(prisma.planTarif.update).toHaveBeenCalledWith({ where: { id: "t-1" }, data: { prixParNuit: 150000, devise: "CDF" } });
  });

  it("applique la devise demandée", async () => {
    prisma.typeChambre.findFirst.mockResolvedValue({ id: "ch-1", tarifs: [{ id: "t-1", devise: "CDF" }] });
    await modifierHotelAdmin("hotel-1", { prixParNuit: 60, devise: "USD" });
    expect(prisma.planTarif.update).toHaveBeenCalledWith({ where: { id: "t-1" }, data: { prixParNuit: 60, devise: "USD" } });
  });

  it("signale un hôtel introuvable", async () => {
    prisma.hotel.findUnique.mockResolvedValue(null);
    await expect(modifierHotelAdmin("inconnu", { nom: "X" })).rejects.toThrow(/introuvable/);
  });
});

describe("retirerHotelAdmin", () => {
  it("désactive l'hôtel au lieu de le supprimer", async () => {
    await retirerHotelAdmin("hotel-1");
    expect(prisma.hotel.update).toHaveBeenCalledWith({ where: { id: "hotel-1" }, data: { actif: false } });
  });
});
