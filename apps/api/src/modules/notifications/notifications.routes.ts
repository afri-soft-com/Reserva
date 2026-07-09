import { Router } from "express";
import * as notificationsController from "./notifications.controller";
import { authentifier } from "../../middlewares/auth";
import { verifierSecretCron } from "../../middlewares/cron";

export const routesNotifications = Router();

routesNotifications.get("/", authentifier, notificationsController.lister);
routesNotifications.get("/compteur", authentifier, notificationsController.compteur);
routesNotifications.patch("/:notificationId/lue", authentifier, notificationsController.marquerLue);
routesNotifications.patch("/toutes-lues", authentifier, notificationsController.marquerToutesLues);

// Endpoint pour scheduler externe — protégé par secret partagé, pas par JWT utilisateur
routesNotifications.post("/cron/rappels", verifierSecretCron, notificationsController.declencherRappels);
