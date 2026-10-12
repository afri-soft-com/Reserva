import { Router } from "express";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { valider } from "../../middlewares/valider";
import { getVersions, putVersions } from "./app-versions.controller";
import { schemaMettreAJourVersions } from "./app-versions.schema";

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
