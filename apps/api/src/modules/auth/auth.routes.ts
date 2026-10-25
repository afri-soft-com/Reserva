import { Router } from "express";
import * as authController from "./auth.controller";
import { valider } from "../../middlewares/valider";
import { authentifier } from "../../middlewares/auth";
import { z } from "zod";
import {
  schemaInscription,
  schemaVerifierOtp,
  schemaDefinirPin,
  schemaConnexionPin,
  schemaDemandeRenvoiOtp,
  schemaDemandeReinitialisationPin,
  schemaReinitialiserPin,
  schemaAuthGoogle,
  schemaAuthGoogleAdmin,
  schemaAuthApple,
  schemaSupprimerCompte,
} from "@reserva/shared";

export const routesAuth = Router();

routesAuth.post("/inscription", valider(schemaInscription), authController.inscrire);
routesAuth.post("/otp/renvoyer", valider(schemaDemandeRenvoiOtp), authController.renvoyerCode);
routesAuth.post("/otp/verifier", valider(schemaVerifierOtp), authController.verifierCodeOtp);
routesAuth.post("/pin/definir", valider(schemaDefinirPin), authController.definirCodePin);
routesAuth.post("/connexion", valider(schemaConnexionPin), authController.connexion);
routesAuth.post("/google", valider(schemaAuthGoogle), authController.connexionGoogle);
routesAuth.post("/google/admin", valider(schemaAuthGoogleAdmin), authController.connexionGoogleAdmin);
routesAuth.post("/apple", valider(schemaAuthApple), authController.connexionApple);
routesAuth.post(
  "/compte/supprimer",
  authentifier,
  valider(schemaSupprimerCompte),
  authController.supprimerCompte
);
routesAuth.get("/profil", authentifier, authController.profil);

// Récupération de compte (mot de passe oublié)
routesAuth.post("/pin/reinitialiser/demander", valider(schemaDemandeReinitialisationPin), authController.demanderReinitialisation);
routesAuth.post("/pin/reinitialiser/confirmer", valider(schemaReinitialiserPin), authController.reinitialiserPin);

// Mise à jour du profil
routesAuth.patch("/profil", authentifier, valider(z.object({
  nom: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  langue: z.enum(["fr", "ln", "sw"]).optional(),
})), authController.mettreAJourProfil);

// Changement de téléphone (OTP sur le nouveau numéro)
routesAuth.post(
  "/telephone/demander",
  authentifier,
  valider(
    z.object({
      nouveauTelephone: z.string().trim().min(9),
      smsAppHash: z.string().trim().min(4).max(32).optional(),
    })
  ),
  authController.demanderChangementTelephone
);
routesAuth.post(
  "/telephone/confirmer",
  authentifier,
  valider(
    z.object({
      nouveauTelephone: z.string().trim().min(9),
      code: z.string().trim().length(6),
    })
  ),
  authController.confirmerChangementTelephone
);

// Photo de profil
routesAuth.patch("/photo", authentifier, valider(z.object({ photoUrl: z.string() })), authController.mettreAJourPhoto);

// 2FA optionnelle
routesAuth.post("/2fa/definir", authentifier, valider(z.object({ actif: z.boolean() })), authController.definir2FA);
routesAuth.post("/2fa/verifier", valider(z.object({ telephone: z.string(), code: z.string().length(6) })), authController.verifier2FA);

// Parrainage
routesAuth.get("/moi/code-parrainage", authentifier, authController.codeParrainage);
routesAuth.get("/moi/parrainages", authentifier, authController.parrainages);
