import { test, expect } from "@playwright/test";
import { ConnexionPage } from "../pages/ConnexionPage";
import { attendreSplash } from "../helpers/attendre";

const ADMIN_TEL = "+243900000001";
const PIN_VALIDE = "1234";

test.describe("Administration", () => {
  test("affiche un message non autorisé pour un visiteur non connecté", async ({ page }) => {
    await page.goto("/admin/statistiques");
    await attendreSplash(page);
    await expect(page.getByText("Accès non autorisé")).toBeVisible({ timeout: 10000 });
  });

  test("affiche les statistiques pour un admin connecté", async ({ page }) => {
    const connexion = new ConnexionPage(page);
    await connexion.aller();
    await connexion.connecter(ADMIN_TEL, PIN_VALIDE);
    await page.waitForFunction(() => window.location.pathname === "/services", {}, { timeout: 20000 });

    await page.goto("/admin/statistiques");
    await attendreSplash(page);
    await expect(page.getByRole("heading", { name: "Statistiques" })).toBeVisible({ timeout: 20000 });

    await expect(page.getByRole("paragraph").filter({ hasText: "Utilisateurs" })).toBeVisible();
    await expect(page.getByRole("paragraph").filter({ hasText: "Prestataires" })).toBeVisible();
    await expect(page.getByRole("paragraph").filter({ hasText: "Réservations" })).toBeVisible();
    await expect(page.getByRole("paragraph").filter({ hasText: "Revenus ce mois" })).toBeVisible();
  });

  test("affiche un message non autorisé pour un client", async ({ page }) => {
    await page.goto("/connexion");
    await attendreSplash(page);
    await page.getByPlaceholder("Ex: 0991234567").fill("+243991234567");
    await page.getByPlaceholder("••••").fill(PIN_VALIDE);
    await page.getByRole("button", { name: "Se connecter" }).click({ force: true });
    await page.waitForFunction(() => window.location.pathname === "/services", {}, { timeout: 20000 });

    await page.goto("/admin/statistiques");
    await attendreSplash(page);
    await expect(page.getByText("Accès non autorisé")).toBeVisible({ timeout: 15000 });
  });
});
