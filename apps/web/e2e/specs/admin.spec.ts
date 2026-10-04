import { test, expect } from "@playwright/test";
import { ConnexionPage } from "../pages/ConnexionPage";
import { attendreSplash } from "../helpers/attendre";

const ADMIN_TEL = "+243900000001";
const PIN_VALIDE = "1234";

test.describe("Administration", () => {
  test("redirige un visiteur non connecté vers la connexion", async ({ page }) => {
    await page.goto("/admin/pilotage");
    await attendreSplash(page);
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15000 });
  });

  test("affiche le pilotage pour un admin connecté", async ({ page }) => {
    const connexion = new ConnexionPage(page);
    await connexion.aller();
    await connexion.connecter(ADMIN_TEL, PIN_VALIDE);
    await page.waitForURL("**/admin/pilotage", { timeout: 20000 });
    await expect(page.getByRole("heading", { name: /Vue d'ensemble/i })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Prestataires/i).first()).toBeVisible();
    await expect(page.getByText(/Alertes actives/i)).toBeVisible();
  });

  test("refuse un compte client sur la console", async ({ page }) => {
    await page.goto("/connexion");
    await attendreSplash(page);
    await page.getByPlaceholder("Ex: 0991234567").fill("+243991234567");
    await page.getByPlaceholder("••••").fill(PIN_VALIDE);
    await page.getByRole("button", { name: "Se connecter" }).click({ force: true });
    await expect(page.getByText(/réservée aux administrateurs/i)).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/connexion/);
  });
});
