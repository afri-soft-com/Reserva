import { test, expect } from "@playwright/test";
import { ConnexionPage } from "../pages/ConnexionPage";

const CLIENT_TEL = "+243991234567";
const ADMIN_TEL = "+243900000001";
const PIN_VALIDE = "1234";

test.describe("Connexion admin", () => {
  test("affiche le formulaire de connexion administrateur", async ({ page }) => {
    const connexion = new ConnexionPage(page);
    await connexion.aller();

    await expect(connexion.titre).toBeVisible();
    await expect(connexion.champTelephone).toBeVisible();
    await expect(connexion.champPin).toBeVisible();
    await expect(connexion.boutonSeConnecter).toBeVisible();
    await expect(connexion.lienMotDePasseOublie).toBeVisible();
  });

  test("refuse un compte client", async ({ page }) => {
    const connexion = new ConnexionPage(page);
    await connexion.aller();
    await connexion.connecter(CLIENT_TEL, PIN_VALIDE);
    await expect(page.getByText(/réservée aux administrateurs/i)).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("connecte un admin vers le pilotage", async ({ page }) => {
    const connexion = new ConnexionPage(page);
    await connexion.aller();
    await connexion.connecter(ADMIN_TEL, PIN_VALIDE);
    await page.waitForURL("**/admin/pilotage", { timeout: 20000 });
    await expect(page).toHaveURL(/\/admin\/pilotage/);
  });

  test("affiche une erreur avec un mauvais PIN", async ({ page }) => {
    const connexion = new ConnexionPage(page);
    await connexion.aller();
    await connexion.connecter(CLIENT_TEL, "0000");
    await expect(page.getByText(/Identifiants invalides/i)).toBeVisible({ timeout: 15000 });
  });

  test("affiche une erreur avec un téléphone inconnu", async ({ page }) => {
    const connexion = new ConnexionPage(page);
    await connexion.aller();
    await connexion.connecter("+243990000000", PIN_VALIDE);
    await expect(page.getByText(/Identifiants invalides/i)).toBeVisible({ timeout: 15000 });
  });
});
