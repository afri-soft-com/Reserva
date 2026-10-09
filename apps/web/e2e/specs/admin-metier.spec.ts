import { test, expect } from "@playwright/test";
import { ConnexionPage } from "../pages/ConnexionPage";

const ADMIN_TEL = "+243900000001";
const PIN_VALIDE = "1234";

async function connecterAdmin(page: import("@playwright/test").Page) {
  const connexion = new ConnexionPage(page);
  await connexion.aller();
  await connexion.connecter(ADMIN_TEL, PIN_VALIDE);
  await page.waitForURL("**/admin/pilotage", { timeout: 20000 });
}

test.describe("Admin métier (finances / prestataires / réservations)", () => {
  test("navigue vers finances et affiche le titre", async ({ page }) => {
    await connecterAdmin(page);
    await page.goto("/admin/finances");
    await expect(page.getByRole("heading", { name: /Finances plateforme/i })).toBeVisible({
      timeout: 20000,
    });
  });

  test("navigue vers prestataires", async ({ page }) => {
    await connecterAdmin(page);
    await page.goto("/admin/prestataires");
    await expect(page.getByText(/Prestataire/i).first()).toBeVisible({ timeout: 20000 });
  });

  test("navigue vers réservations", async ({ page }) => {
    await connecterAdmin(page);
    await page.goto("/admin/reservations");
    await expect(page.getByText(/Réservation/i).first()).toBeVisible({ timeout: 20000 });
  });
});
