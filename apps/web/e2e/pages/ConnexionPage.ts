import { Page, Locator } from "@playwright/test";
import { attendreSplash } from "../helpers/attendre";

export class ConnexionPage {
  readonly page: Page;
  readonly titre: Locator;
  readonly champTelephone: Locator;
  readonly champPin: Locator;
  readonly boutonSeConnecter: Locator;
  readonly lienInscription: Locator;
  readonly lienMotDePasseOublie: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titre = page.getByRole("heading", { name: "Connexion" });
    this.champTelephone = page.getByPlaceholder("Ex: 0991234567");
    this.champPin = page.getByPlaceholder("••••");
    this.boutonSeConnecter = page.getByRole("button", { name: "Se connecter" });
    this.lienInscription = page.getByRole("link", { name: "Inscrivez-vous" });
    this.lienMotDePasseOublie = page.getByRole("link", { name: "Mot de passe oublié" });
  }

  async aller() {
    await this.page.goto("/connexion");
    await attendreSplash(this.page);
  }

  async connecter(telephone: string, pin: string) {
    await this.champTelephone.fill(telephone);
    await this.champPin.fill(pin);
    await this.boutonSeConnecter.click({ force: true });
  }
}
