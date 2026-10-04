import "dotenv/config";

function lire(nom: string, defaut?: string): string {
  const v = process.env[nom] ?? defaut;
  if (v === undefined) throw new Error(`Variable manquante : ${nom}`);
  return v;
}

export const env = {
  PORT: parseInt(lire("PORT", "4000"), 10),
  NODE_ENV: lire("NODE_ENV", "development"),
  WEB_URL: lire("WEB_URL", "http://localhost:3001"),
  CORE_URL: lire("CORE_URL", "http://localhost:4101"),
  HOTELS_URL: lire("HOTELS_URL", "http://localhost:4102"),
  BOOKING_URL: lire("BOOKING_URL", "http://localhost:4103"),
  TRANSPORT_URL: lire("TRANSPORT_URL", "http://localhost:4104"),
};
