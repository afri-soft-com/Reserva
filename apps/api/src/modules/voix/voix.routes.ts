import { Router } from "express";
import { authentifier } from "../../middlewares/auth";
import { valider } from "../../middlewares/valider";
import { schemaTokenVoix } from "./voix.schema";
import { tokenVoix } from "./voix.controller";

export const routesVoix = Router();

routesVoix.use(authentifier);
routesVoix.post("/token", valider(schemaTokenVoix), tokenVoix);
