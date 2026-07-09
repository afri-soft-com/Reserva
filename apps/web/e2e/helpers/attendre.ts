import { Page } from "@playwright/test";

export async function attendreSplash(page: Page) {
  await page.waitForLoadState("networkidle");
  try {
    await page.locator("#splash-ecran").waitFor({ state: "hidden", timeout: 10000 });
  } catch {
    // splash déjà disparu
  }
}
