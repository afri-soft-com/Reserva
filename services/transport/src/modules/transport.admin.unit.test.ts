import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  ligne: { upsert: vi.fn() },
  operateur: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  trajet: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("../config/prisma", () => ({ prisma }));

import { creerTrajetAdmin, modifierTrajetAdmin, retirerTrajetAdmin } from "./transport.service";

const saisie = {
  origine: "Kinshasa",
  destination: "Matadi",
  dateDepart: "2026-12-15",
  heureDepart: "07:30",
  dureeMinutes: 360,
  prix: 25000,
  placesTotales: 40,
  operateurNom: "Trans-Congo",
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.ligne.upsert.mockResolvedValue({ id: "ligne-1" });
  prisma.operateur.findFirst.mockResolvedValue({ id: "op-1", actif: true });
  prisma.trajet.create.mockImplementation(async ({ data }) => ({ id: "trajet-1", ...data }));
  prisma.trajet.update.mockImplementation(async ({ data }) => ({ id: "trajet-1", ...data }));
});

describe("creerTrajetAdmin", () => {
  it("crée le trajet avec la ligne et l'opérateur trouvés", async () => {
    const trajet = await creerTrajetAdmin(saisie);
    expect(trajet).toMatchObject({ ligneId: "ligne-1", operateurId: "op-1", placesTotales: 40, confort: "STANDARD" });
  });

  it.each([
    ["une date impossible", { dateDepart: "2026-02-31" }],
    ["une heure hors limites", { heureDepart: "24:10" }],
    ["une origine égale à la destination", { destination: "kinshasa" }],
    ["un prix nul", { prix: 0 }],
    ["trop de places", { placesTotales: 81 }],
    ["une durée trop courte", { dureeMinutes: 5 }],
    ["un opérateur manquant", { operateurNom: "  " }],
  ])("refuse %s", async (_cas, champ) => {
    await expect(creerTrajetAdmin({ ...saisie, ...champ })).rejects.toThrow();
    expect(prisma.trajet.create).not.toHaveBeenCalled();
  });
});

describe("modifierTrajetAdmin", () => {
  beforeEach(() => {
    prisma.trajet.findUnique.mockResolvedValue({
      id: "trajet-1",
      placesVendues: 10,
      placesReservees: 5,
      ligne: { origine: "Kinshasa", destination: "Matadi" },
    });
  });

  it("refuse moins de places que celles déjà prises", async () => {
    await expect(modifierTrajetAdmin("trajet-1", { placesTotales: 12 })).rejects.toThrow(/places déjà prises/);
  });

  it("accepte un nombre de places couvrant les places prises", async () => {
    const trajet = await modifierTrajetAdmin("trajet-1", { placesTotales: 15 });
    expect(trajet).toMatchObject({ placesTotales: 15 });
  });

  it("signale un trajet introuvable", async () => {
    prisma.trajet.findUnique.mockResolvedValue(null);
    await expect(modifierTrajetAdmin("inconnu", { prix: 1000 })).rejects.toThrow(/introuvable/);
  });
});

describe("retirerTrajetAdmin", () => {
  it("désactive un trajet qui a des places vendues, sans le supprimer", async () => {
    prisma.trajet.findUnique.mockResolvedValue({ id: "trajet-1", placesVendues: 2, placesReservees: 0 });
    await retirerTrajetAdmin("trajet-1");
    expect(prisma.trajet.update).toHaveBeenCalledWith(expect.objectContaining({ data: { actif: false } }));
    expect(prisma.trajet.delete).not.toHaveBeenCalled();
  });

  it("supprime un trajet sans aucune place prise", async () => {
    prisma.trajet.findUnique.mockResolvedValue({ id: "trajet-1", placesVendues: 0, placesReservees: 0 });
    await expect(retirerTrajetAdmin("trajet-1")).resolves.toEqual({ supprime: true, id: "trajet-1" });
    expect(prisma.trajet.delete).toHaveBeenCalled();
  });
});
