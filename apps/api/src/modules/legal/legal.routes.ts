import { Router } from "express";
import { authentifier } from "../../middlewares/auth";
import { getPrivacyAdmin, getPrivacyPublique, putPrivacyAdmin } from "./legal.controller";
import { exigerSuperAdmin } from "./legal.superadmin";

export const routesLegal = Router();

/** Public — apps / site. */
routesLegal.get("/privacy", getPrivacyPublique);

/** SuperAdmin only. */
routesLegal.get("/admin/privacy", authentifier, exigerSuperAdmin, getPrivacyAdmin);
routesLegal.put("/admin/privacy", authentifier, exigerSuperAdmin, putPrivacyAdmin);
