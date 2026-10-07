import { Client } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://reserva:reserva@127.0.0.1:5432/reserva?schema=core";

let client: Client | null = null;

async function ouvrir(): Promise<Client> {
  if (!client) {
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    await client.query("SET search_path TO core, public");
  }
  return client;
}

export async function fermer() {
  if (client) {
    await client.end();
    client = null;
  }
}

export async function obtenirDernierOtp(telephone: string): Promise<string | null> {
  const bd = await ouvrir();
  const res = await bd.query<{ code: string }>(
    `SELECT otp.code
     FROM otps otp
     JOIN utilisateurs u ON u.id = otp."utilisateurId"
     WHERE u.telephone = $1
     ORDER BY otp."creeLe" DESC
     LIMIT 1`,
    [telephone]
  );
  return res.rows[0]?.code ?? null;
}
