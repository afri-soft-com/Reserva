import { Router } from "express";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { verifierSecretCron } from "../../middlewares/cron";
import { valider } from "../../middlewares/valider";
import { getVersions, publierSeuils, putVersions } from "./app-versions.controller";
import { schemaMettreAJourVersions, schemaPublierSeuils } from "./app-versions.schema";

export const routesAppVersions = Router();

/** Public — mobile / web consultent les versions min sans auth. */
routesAppVersions.get("/versions", getVersions);

routesAppVersions.put(
  "/versions",
  authentifier,
  exigerRole("ADMIN"),
  valider(schemaMettreAJourVersions),
  putVersions,
);

/** CI / scheduler : publie les seuils après deploy (X-Cron-Secret). */
routesAppVersions.post(
  "/cron/publier-seuils",
  verifierSecretCron,
  valider(schemaPublierSeuils),
  publierSeuils,
);
