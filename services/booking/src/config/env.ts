import "dotenv/config";

function lire(nom: string, defaut?: string): string {
  const v = process.env[nom] ?? defaut;
  if (v === undefined) throw new Error(`Variable manquante : ${nom}`);
  return v;
}

export const env = {
  PORT: parseInt(lire("PORT", "4103"), 10),
  NODE_ENV: lire("NODE_ENV", "development"),
  DATABASE_URL: lire("DATABASE_URL", "file:./booking.db"),
  JWT_SECRET: lire("JWT_SECRET"),
  WEB_URL: lire("WEB_URL", "http://localhost:3001"),
  HOTELS_URL: lire("HOTELS_URL", "http://localhost:4102"),
  TRANSPORT_URL: lire("TRANSPORT_URL", "http://localhost:4104"),
  HOLD_MINUTES: parseInt(lire("HOLD_MINUTES", "15"), 10),
  SERVICE_SECRET: lire("SERVICE_SECRET", "reserva-service-dev"),
};
