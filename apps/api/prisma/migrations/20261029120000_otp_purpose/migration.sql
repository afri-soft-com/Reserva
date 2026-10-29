-- Scope OTP by purpose + optional target phone (anti cross-flow reuse)
ALTER TABLE "otps" ADD COLUMN IF NOT EXISTS "purpose" TEXT NOT NULL DEFAULT 'INSCRIPTION';
ALTER TABLE "otps" ADD COLUMN IF NOT EXISTS "telephoneCible" TEXT;

CREATE INDEX IF NOT EXISTS "otps_utilisateurId_purpose_utilise_idx"
  ON "otps"("utilisateurId", "purpose", "utilise");
