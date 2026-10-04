import "dotenv/config";

function lireVariable(nom: string, valeurParDefaut?: string): string {
  const valeur = process.env[nom] ?? valeurParDefaut;
  if (valeur === undefined) {
    throw new Error(`Variable d'environnement manquante : ${nom}. Vérifiez votre fichier .env (copiez .env.example).`);
  }
  return valeur;
}

export const env = {
  PORT: parseInt(lireVariable("PORT", "4101"), 10),
  NODE_ENV: lireVariable("NODE_ENV", "development"),
  DATABASE_URL: lireVariable("DATABASE_URL"),
  JWT_SECRET: lireVariable("JWT_SECRET"),
  JWT_EXPIRATION: lireVariable("JWT_EXPIRATION", "7d"),
  MODE_PAIEMENT: lireVariable("MODE_PAIEMENT", "simulation") as "simulation" | "production",
  MODE_SMS: lireVariable("MODE_SMS", "simulation") as "simulation" | "production",
  WEB_URL: lireVariable("WEB_URL", "http://localhost:3001"),
  CRON_SECRET: lireVariable("CRON_SECRET"),
};

export const estProduction = env.NODE_ENV === "production";
