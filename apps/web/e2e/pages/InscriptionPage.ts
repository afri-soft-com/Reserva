import { Page, Locator } from "@playwright/test";
import { attendreSplash } from "../helpers/attendre";

export class InscriptionPage {
  readonly page: Page;
  readonly titre: Locator;
  readonly champNom: Locator;
  readonly champTelephone: Locator;
  readonly champEmail: Locator;
  readonly boutonContinuer: Locator;
  readonly champCodeOtp: Locator;
  readonly boutonVerifier: Locator;
  readonly sectionPin: Locator;
  readonly champPin: Locator;
  readonly boutonTerminer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titre = page.getByRole("heading", { name: "Créer un compte" });
    this.champNom = page.getByPlaceholder("Ex: Jean Mukendi");
    this.champTelephone = page.getByPlaceholder("Ex: 0991234567");
    this.champEmail = page.getByPlaceholder("vous@exemple.com");
    this.boutonContinuer = page.getByRole("button", { name: "Continuer" });
    this.champCodeOtp = page.getByPlaceholder("123456");
    this.boutonVerifier = page.getByRole("button", { name: "Vérifier" });
    this.sectionPin = page.getByText("Choisissez un code PIN à 4 chiffres");
    this.champPin = page.locator("input[inputMode='numeric'][maxLength='4']").first();
    this.boutonTerminer = page.getByRole("button", { name: "Terminer" });
  }

  async aller() {
    await this.page.goto("/inscription");
    await attendreSplash(this.page);
  }

  async remplirFormulaire(nom: string, telephone: string, email?: string) {
    await this.champNom.fill(nom);
    await this.champTelephone.fill(telephone);
    if (email) await this.champEmail.fill(email);
  }

  async soumettreFormulaire() {
    await this.boutonContinuer.click({ force: true });
  }

  async saisirOtp(code: string) {
    await this.champCodeOtp.fill(code);
  }

  async verifierOtp() {
    await this.boutonVerifier.click({ force: true });
  }

  async definirPin(pin: string) {
    await this.sectionPin.waitFor({ state: "visible", timeout: 10000 });
    const champsPin = this.page.locator("input[inputMode='numeric'][maxLength='4']");
    await champsPin.nth(0).fill(pin);
    await champsPin.nth(1).fill(pin);
    await this.boutonTerminer.click({ force: true });
  }
}
