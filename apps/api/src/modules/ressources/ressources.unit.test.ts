import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  prestataire: { findUnique: vi.fn() },
  serviceOffert: { findUnique: vi.fn() },
  ressource: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn() },
  creneau: { findMany: vi.fn(), update: vi.fn() },
  reservation: { count: vi.fn() },
}));
vi.mock("../../config/prisma", () => ({ prisma }));

import {
  attribuerTable,
  choisirTable,
  creerRessourcesEnLot,
  retirerRessource,
  synchroniserCapaciteCreneaux,
} from "./ressources.service";
import { schemaCreerServiceOffert, schemaModifierServiceOffert } from "../prestataires/prestataires.schema";
import { schemaCreerReservation } from "@reserva/shared";

beforeEach(() => {
  vi.clearAllMocks();
  prisma.prestataire.findUnique.mockResolvedValue({ id: "presta-1" });
  prisma.serviceOffert.findUnique.mockResolvedValue({ id: "svc-1", prestataireId: "presta-1", modeReservation: "TABLE" });
  prisma.creneau.findMany.mockResolvedValue([]);
  prisma.ressource.count.mockResolvedValue(0);
});

describe("choisirTable", () => {
  const tables = [
    { id: "t6", capacite: 6 },
    { id: "t2", capacite: 2 },
    { id: "t4", capacite: 4 },
  ];

  it("prend la plus petite table qui accueille le groupe", () => {
    expect(choisirTable(tables, 3)?.id).toBe("t4");
    expect(choisirTable(tables, 2)?.id).toBe("t2");
    expect(choisirTable(tables, 5)?.id).toBe("t6");
  });

  it("renvoie null si aucune table n'est assez grande", () => {
    expect(choisirTable(tables, 7)).toBeNull();
    expect(choisirTable([], 1)).toBeNull();
  });
});

describe("attribuerTable", () => {
  const creneau = { id: "c-1", debut: new Date("2030-01-01T19:00:00Z"), fin: new Date("2030-01-01T21:00:00Z") };

  function tx(libres: { id: string; capacite: number }[], capaciteMax: number | null = 6) {
    return {
      $queryRaw: vi.fn().mockResolvedValue([]),
      ressource: {
        findMany: vi.fn().mockResolvedValue(libres),
        aggregate: vi.fn().mockResolvedValue({ _max: { capacite: capaciteMax } }),
      },
    } as any;
  }

  it("ne fait rien pour un service en mode CRENEAU", async () => {
    const client = tx([]);
    const table = await attribuerTable(client, { service: { id: "svc-1", modeReservation: "CRENEAU" }, creneau, nombrePersonnes: 4 });
    expect(table).toBeNull();
    expect(client.$queryRaw).not.toHaveBeenCalled();
  });

  it("verrouille le créneau puis attribue une table adaptée", async () => {
    const client = tx([{ id: "t2", capacite: 2 }, { id: "t4", capacite: 4 }]);
    const table = await attribuerTable(client, { service: { id: "svc-1", modeReservation: "TABLE" }, creneau, nombrePersonnes: 3 });
    expect(client.$queryRaw).toHaveBeenCalledTimes(1);
    expect(table?.id).toBe("t4");
    // Les tables occupées sont filtrées par chevauchement horaire
    const where = client.ressource.findMany.mock.calls[0][0].where;
    expect(where.reservations.none.creneau).toEqual({ debut: { lt: creneau.fin }, fin: { gt: creneau.debut } });
  });

  it("explique quand le groupe dépasse la plus grande table", async () => {
    const client = tx([{ id: "t4", capacite: 4 }], 6);
    await expect(
      attribuerTable(client, { service: { id: "svc-1", modeReservation: "TABLE" }, creneau, nombrePersonnes: 8 })
    ).rejects.toThrow(/plus grande table accueille 6/);
  });

  it("signale un créneau complet pour cette taille de groupe", async () => {
    const client = tx([{ id: "t2", capacite: 2 }], 6);
    await expect(
      attribuerTable(client, { service: { id: "svc-1", modeReservation: "TABLE" }, creneau, nombrePersonnes: 5 })
    ).rejects.toThrow(/Plus de table libre pour 5/);
  });

  it("signale un restaurant sans tables configurées", async () => {
    const client = tx([], null);
    await expect(
      attribuerTable(client, { service: { id: "svc-1", modeReservation: "TABLE" }, creneau, nombrePersonnes: 2 })
    ).rejects.toThrow(/pas encore configuré/);
  });
});

describe("synchroniserCapaciteCreneaux", () => {
  it("aligne les créneaux à venir sur le nombre de tables sans passer sous les réservations", async () => {
    prisma.ressource.count.mockResolvedValue(5);
    prisma.creneau.findMany.mockResolvedValue([
      { id: "a", capaciteTotale: 1, capaciteReservee: 0 },
      { id: "b", capaciteTotale: 8, capaciteReservee: 7 },
      { id: "c", capaciteTotale: 5, capaciteReservee: 2 },
    ]);
    await synchroniserCapaciteCreneaux("svc-1");
    expect(prisma.creneau.update).toHaveBeenCalledTimes(2);
    expect(prisma.creneau.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { capaciteTotale: 5 } });
    expect(prisma.creneau.update).toHaveBeenCalledWith({ where: { id: "b" }, data: { capaciteTotale: 7 } });
  });
});

describe("creerRessourcesEnLot", () => {
  it("numérote à la suite des tables existantes", async () => {
    prisma.ressource.findMany.mockResolvedValue([{ nom: "Table 1" }, { nom: "Table 3" }]);
    await creerRessourcesEnLot("user-1", { serviceId: "svc-1", nombre: 3, capacite: 4 });
    const noms = prisma.ressource.createMany.mock.calls[0][0].data.map((d: { nom: string }) => d.nom);
    expect(noms).toEqual(["Table 2", "Table 4", "Table 5"]);
  });

  it("refuse le service d'un autre prestataire", async () => {
    prisma.serviceOffert.findUnique.mockResolvedValue({ id: "svc-1", prestataireId: "autre" });
    await expect(creerRessourcesEnLot("user-1", { serviceId: "svc-1", nombre: 2, capacite: 2 })).rejects.toThrow(/non trouvé/);
    expect(prisma.ressource.createMany).not.toHaveBeenCalled();
  });
});

describe("retirerRessource", () => {
  it("bloque le retrait d'une table qui a des réservations à venir", async () => {
    prisma.ressource.findUnique.mockResolvedValue({ id: "t1", serviceId: "svc-1" });
    prisma.reservation.count.mockResolvedValue(2);
    await expect(retirerRessource("user-1", "t1")).rejects.toThrow(/2 réservation/);
    expect(prisma.ressource.update).not.toHaveBeenCalled();
  });
});

describe("schémas", () => {
  it("une modification partielle de service ne réinitialise ni devise ni mode", () => {
    expect(schemaModifierServiceOffert.parse({ actif: false })).toEqual({ actif: false });
  });

  it("un nouveau service est en mode CRENEAU par défaut", () => {
    const s = schemaCreerServiceOffert.parse({ nom: "Coupe", prix: 5000 });
    expect(s).toMatchObject({ modeReservation: "CRENEAU", prixParPersonne: false, devise: "CDF", dureeMinutes: 30 });
  });

  it("la réservation accepte un nombre de couverts (1 par défaut)", () => {
    const base = {
      serviceId: "6f1c2c3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f",
      creneauId: "7f1c2c3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f",
    };
    expect(schemaCreerReservation.parse(base).nombrePersonnes).toBe(1);
    expect(schemaCreerReservation.parse({ ...base, nombrePersonnes: "6" }).nombrePersonnes).toBe(6);
    expect(schemaCreerReservation.safeParse({ ...base, nombrePersonnes: 0 }).success).toBe(false);
  });
});
