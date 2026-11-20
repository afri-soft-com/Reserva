import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => {
  const p: any = {
    hotel: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    typeChambre: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    planTarif: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    disponibiliteJour: { findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  };
  p.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(p));
  return p;
});
vi.mock("../config/prisma", () => ({ prisma }));

import { creerChambre, definirInventaire, joursPeriode, lireInventaire } from "./hotels.pro.service";

const proprio = { utilisateurId: "user-1", role: "PRESTATAIRE" };

beforeEach(() => {
  vi.clearAllMocks();
  prisma.hotel.findUnique.mockResolvedValue({ id: "h-1", prestataireId: "user-1" });
  prisma.typeChambre.findUnique.mockResolvedValue({ id: "ch-1", hotelId: "h-1" });
  prisma.disponibiliteJour.findMany.mockResolvedValue([]);
});

describe("joursPeriode", () => {
  it("inclut le jour de fin", () => {
    expect(joursPeriode("2030-03-30", "2030-04-01")).toEqual(["2030-03-30", "2030-03-31", "2030-04-01"]);
  });

  it("filtre par jours de semaine (vendredi/samedi)", () => {
    // 2030-03-01 est un vendredi
    expect(joursPeriode("2030-03-01", "2030-03-07", [5, 6])).toEqual(["2030-03-01", "2030-03-02"]);
  });

  it("refuse une période inversée ou trop longue", () => {
    expect(() => joursPeriode("2030-03-05", "2030-03-01")).toThrow(/postérieure/);
    expect(() => joursPeriode("2030-01-01", "2031-06-01")).toThrow(/trop longue/);
  });
});

describe("propriété", () => {
  it("refuse l'hôtel d'un autre prestataire", async () => {
    prisma.hotel.findUnique.mockResolvedValue({ id: "h-1", prestataireId: "autre" });
    await expect(creerChambre(proprio, "h-1", { nom: "Suite" })).rejects.toThrow(/appartient pas/);
    expect(prisma.typeChambre.create).not.toHaveBeenCalled();
  });

  it("autorise l'admin sur tous les hôtels", async () => {
    prisma.hotel.findUnique.mockResolvedValue({ id: "h-1", prestataireId: "autre" });
    prisma.typeChambre.create.mockResolvedValue({ id: "ch-2" });
    await creerChambre({ utilisateurId: "admin", role: "ADMIN" }, "h-1", { nom: "Suite" });
    expect(prisma.typeChambre.create).toHaveBeenCalled();
  });
});

describe("definirInventaire", () => {
  it("crée les jours absents et met à jour les existants", async () => {
    prisma.disponibiliteJour.findMany.mockResolvedValue([
      { id: "d-1", jour: "2030-03-01", total: 3, vendues: 1, reservees: 0 },
    ]);
    const r = await definirInventaire(proprio, "ch-1", { du: "2030-03-01", au: "2030-03-02", total: 5 });
    expect(r).toEqual({ joursMisAJour: 2 });
    expect(prisma.disponibiliteJour.update).toHaveBeenCalledWith({ where: { id: "d-1" }, data: { total: 5 } });
    expect(prisma.disponibiliteJour.create).toHaveBeenCalledWith({
      data: { typeChambreId: "ch-1", jour: "2030-03-02", total: 5, prix: 0 },
    });
  });

  it("ne modifie que le prix si seul le prix est fourni", async () => {
    prisma.disponibiliteJour.findMany.mockResolvedValue([
      { id: "d-1", jour: "2030-03-01", total: 3, vendues: 3, reservees: 0 },
    ]);
    await definirInventaire(proprio, "ch-1", { du: "2030-03-01", au: "2030-03-01", prix: 120 });
    expect(prisma.disponibiliteJour.update).toHaveBeenCalledWith({ where: { id: "d-1" }, data: { prix: 120 } });
  });

  it("refuse de descendre sous les chambres déjà vendues ou retenues", async () => {
    prisma.disponibiliteJour.findMany.mockResolvedValue([
      { id: "d-1", jour: "2030-03-01", total: 5, vendues: 3, reservees: 1 },
    ]);
    await expect(
      definirInventaire(proprio, "ch-1", { du: "2030-03-01", au: "2030-03-01", total: 2 })
    ).rejects.toThrow(/4 déjà réservée\(s\) le 2030-03-01/);
    expect(prisma.disponibiliteJour.update).not.toHaveBeenCalled();
  });
});

describe("lireInventaire", () => {
  it("renvoie 0 chambre libre pour les jours non ouverts", async () => {
    prisma.disponibiliteJour.findMany.mockResolvedValue([
      { jour: "2030-03-01", total: 4, vendues: 1, reservees: 1, prix: 0 },
    ]);
    const r = await lireInventaire(proprio, "ch-1", "2030-03-01", "2030-03-02");
    expect(r).toEqual([
      { jour: "2030-03-01", total: 4, vendues: 1, reservees: 1, libres: 2, prix: 0 },
      { jour: "2030-03-02", total: 0, vendues: 0, reservees: 0, libres: 0, prix: 0 },
    ]);
  });
});
