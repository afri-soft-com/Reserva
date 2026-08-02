import { Router } from "express";
import { z } from "zod";
import * as indisponibilitesController from "./indisponibilites.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";

export const routesIndisponibilites = Router();

const schemaCreer = z
  .object({
    serviceId: z.string().uuid("Identifiant de service invalide").optional(),
    dateDebut: z.string().min(1, "Date de début requise"),
    dateFin: z.string().min(1, "Date de fin requise"),
    motif: z.string().max(200, "Motif trop long").optional(),
  })
  .refine((d) => new Date(d.dateFin).getTime() > new Date(d.dateDebut).getTime(), {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["dateFin"],
  });

routesIndisponibilites.get(
  "/moi",
  authentifier,
  exigerRole("PRESTATAIRE", "ADMIN"),
  indisponibilitesController.lister
);
routesIndisponibilites.post(
  "/",
  authentifier,
  exigerRole("PRESTATAIRE", "ADMIN"),
  valider(schemaCreer),
  indisponibilitesController.creer
);
routesIndisponibilites.delete(
  "/:periodeId",
  authentifier,
  exigerRole("PRESTATAIRE", "ADMIN"),
  indisponibilitesController.supprimer
);
