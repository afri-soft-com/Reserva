import { Router } from "express";
import { VILLES_RDC, VILLES_RDC_DETAIL, PROVINCES_RDC } from "@reserva/shared";
import { envoyerSucces } from "../../utils/reponse";

export const routesReferentiel = Router();

/** Liste publique des villes RDC (filtre optionnel ?province=). */
routesReferentiel.get("/villes", (req, res) => {
  const province = typeof req.query.province === "string" ? req.query.province.trim() : "";
  const detail = province
    ? VILLES_RDC_DETAIL.filter((v) => v.province.toLowerCase() === province.toLowerCase())
    : [...VILLES_RDC_DETAIL];
  envoyerSucces(res, {
    villes: detail.map((v) => v.nom),
    detail,
    provinces: PROVINCES_RDC,
    total: detail.length,
  });
});

routesReferentiel.get("/provinces", (_req, res) => {
  envoyerSucces(res, { provinces: PROVINCES_RDC });
});
