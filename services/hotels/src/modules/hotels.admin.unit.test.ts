import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  hotel: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  typeChambre: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  planTarif: { create: vi.fn(), update: vi.fn() },
  disponibiliteJour: { findFirst: vi.fn(), createMany: vi.fn() },
}));
vi.mock("../config/prisma", () => ({ prisma }));

import {
  CHAMBRES_PAR_DEFAUT,
  completerDisponibilitesCatalogue,
  creerHotelAdmin,
  joursHorizon,
  modifierHotelAdmin,
  ouvrirDisponibilites,
  retirerHotelAdmin,
} from "./hotels.service";

beforeEach(() => {
  vi.clearAllMocks();
  prisma.hotel.create.mockImplementation(async ({ data }) => ({ id: "hotel-1", ...data }));
  prisma.hotel.findUnique.mockResolvedValue({ id: "hotel-1", actif: true });
  prisma.hotel.update.mockImplementation(async ({ data }) => ({ id: "hotel-1", ...data }));
  prisma.typeChambre.create.mockResolvedValue({ id: "ch-neuve" });
  prisma.disponibiliteJour.findFirst.mockResolvedValue(null);
  prisma.disponibiliteJour.createMany.mockImplementation(async ({ data }) => ({ count: data.length }));
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

  it("ouvre les nuits de la nouvelle chambre pour qu'elle soit réservable", async () => {
    prisma.typeChambre.findFirst.mockResolvedValue(null);
    await creerHotelAdmin({ nom: "Fleuve", ville: "Kinshasa", quartier: "Gombe", prixParNuit: 80 });
    const appel = prisma.disponibiliteJour.createMany.mock.calls[0][0];
    expect(appel.skipDuplicates).toBe(true);
    expect(appel.data.length).toBeGreaterThan(365);
    expect(appel.data[0]).toMatchObject({ typeChambreId: "ch-neuve", total: CHAMBRES_PAR_DEFAUT });
  });

  it("sans prix, ne crée ni chambre ni disponibilités", async () => {
    await creerHotelAdmin({ nom: "Fleuve", ville: "Kinshasa", quartier: "Gombe" });
    expect(prisma.typeChambre.create).not.toHaveBeenCalled();
    expect(prisma.disponibiliteJour.createMany).not.toHaveBeenCalled();
  });
});

describe("disponibilités", () => {
  it("couvre de la veille à un an, jours consécutifs au format AAAA-MM-JJ", () => {
    const jours = joursHorizon(new Date(2026, 10, 27, 15, 0));
    expect(jours[0]).toBe("2026-11-26");
    expect(jours).toContain("2026-12-31");
    expect(jours.at(-1)).toBe("2027-11-26");
    expect(new Set(jours).size).toBe(jours.length);
  });

  it("reprend le stock existant de la chambre", async () => {
    prisma.disponibiliteJour.findFirst.mockResolvedValue({ total: 4 });
    await ouvrirDisponibilites("ch-1", new Date(2026, 10, 27));
    const { data } = prisma.disponibiliteJour.createMany.mock.calls[0][0];
    expect(data.every((d: { total: number }) => d.total === 4)).toBe(true);
  });

  it("complète toutes les chambres actives du catalogue", async () => {
    prisma.typeChambre.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    prisma.disponibiliteJour.createMany.mockResolvedValue({ count: 3 });
    const r = await completerDisponibilitesCatalogue();
    expect(r).toEqual({ chambres: 2, nuitsAjoutees: 6 });
    expect(prisma.typeChambre.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { actif: true, hotel: { actif: true } } }),
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
