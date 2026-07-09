import { test, expect } from "@playwright/test";
import { InscriptionPage } from "../pages/InscriptionPage";
import { obtenirDernierOtp, fermer } from "../helpers/db";

test.afterAll(() => fermer());

const TELEPHONE_TEST = `+24399888${String(Math.random()).slice(2, 6)}`;

test.describe("Inscription", () => {
  test("affiche le formulaire d'inscription", async ({ page }) => {
    const inscription = new InscriptionPage(page);
    await inscription.aller();

    await expect(inscription.titre).toBeVisible();
    await expect(inscription.champNom).toBeVisible();
    await expect(inscription.champTelephone).toBeVisible();
    await expect(inscription.boutonContinuer).toBeVisible();
  });

  test("inscrit un nouvel utilisateur (flux complet)", async ({ page }) => {
    const inscription = new InscriptionPage(page);
    await inscription.aller();
    await inscription.remplirFormulaire("Test E2E", TELEPHONE_TEST);
    await inscription.soumettreFormulaire();

    await expect(page.getByText("Un code de vérification a été envoyé par SMS.")).toBeVisible({ timeout: 10000 });

    const otp = obtenirDernierOtp(TELEPHONE_TEST);
    expect(otp).not.toBeNull();
    await inscription.saisirOtp(otp!);
    await inscription.verifierOtp();

    await expect(page.getByText("Numéro vérifié avec succès")).toBeVisible({ timeout: 10000 });

    await inscription.definirPin("4321");

    await page.waitForFunction(() => window.location.pathname === "/services", {}, { timeout: 20000 });
    await expect(page).toHaveURL("/services");
  });

  test("affiche une erreur pour un téléphone déjà utilisé", async ({ page }) => {
    const inscription = new InscriptionPage(page);
    await inscription.aller();
    await inscription.remplirFormulaire("Test Duplicata", "+243991234567");
    await inscription.soumettreFormulaire();

    await expect(page.getByText(/déjà associé|déjà utilisé|existe/i)).toBeVisible({ timeout: 10000 });
  });
});
