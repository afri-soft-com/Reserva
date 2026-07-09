import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(__dirname, "..", "..", "..", "api", "prisma", "dev.db");

let db: Database.Database | null = null;

function ouvrir(): Database.Database {
  if (!db) db = new Database(DB_PATH);
  return db;
}

export function fermer() {
  if (db) {
    db.close();
    db = null;
  }
}

export function obtenirDernierOtp(telephone: string): string | null {
  const bd = ouvrir();
  const ligne = bd
    .prepare(
      `SELECT otp.code
       FROM otps otp
       JOIN utilisateurs u ON u.id = otp.utilisateurId
       WHERE u.telephone = ?
       ORDER BY otp.creeLe DESC
       LIMIT 1`
    )
    .get(telephone) as { code: string } | undefined;
  return ligne?.code ?? null;
}
