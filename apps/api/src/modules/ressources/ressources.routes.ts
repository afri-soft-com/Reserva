import { Router } from "express";
import { z } from "zod";
import * as ressourcesController from "./ressources.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";

/** Tables (ressources physiques) des services en mode TABLE — espace prestataire */
export const routesRessources = Router();

const schemaCreer = z.object({
  serviceId: z.string().guid("Identifiant de service invalide"),
  nom: z.string().trim().min(1, "Nom requis").max(60),
  capacite: z.coerce.number().int().min(1).max(50),
});

const schemaLot = z.object({
  serviceId: z.string().guid("Identifiant de service invalide"),
  nombre: z.coerce.number().int().min(1).max(100),
  capacite: z.coerce.number().int().min(1).max(50),
  prefixe: z.string().trim().max(40).optional(),
});

const schemaModifier = z
  .object({
    nom: z.string().trim().min(1).max(60).optional(),
    capacite: z.coerce.number().int().min(1).max(50).optional(),
    actif: z.boolean().optional(),
  })
  .refine((d) => d.nom !== undefined || d.capacite !== undefined || d.actif !== undefined, {
    message: "Indiquez au moins un champ à modifier",
  });

const schemaReattribuer = z.object({
  ressourceId: z.string().guid("Identifiant de table invalide"),
});

const pro = [authentifier, exigerRole("PRESTATAIRE")];

routesRessources.get("/service/:serviceId", ...pro, ressourcesController.lister);
routesRessources.post("/", ...pro, valider(schemaCreer), ressourcesController.creer);
routesRessources.post("/lot", ...pro, valider(schemaLot), ressourcesController.creerEnLot);
routesRessources.patch("/:ressourceId", ...pro, valider(schemaModifier), ressourcesController.modifier);
routesRessources.delete("/:ressourceId", ...pro, ressourcesController.retirer);
routesRessources.post(
  "/reservations/:reservationId/table",
  ...pro,
  valider(schemaReattribuer),
  ressourcesController.reattribuer
);
