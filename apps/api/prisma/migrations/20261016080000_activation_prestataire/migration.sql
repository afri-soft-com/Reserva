-- Code d'activation prestataire : horodatage de confirmation
ALTER TABLE "prestataires" ADD COLUMN IF NOT EXISTS "activationConfirmeeLe" TIMESTAMP(3);

-- Prestataires déjà approuvés : considérés comme activés (pas de blocage rétroactif)
UPDATE "prestataires"
SET "activationConfirmeeLe" = COALESCE("kycValideLe", "creeLe")
WHERE "statut" = 'APPROUVE' AND "activationConfirmeeLe" IS NULL;
