-- Délai anti-litige : date de libération planifiée du séquestre
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "sequestreLiberableLe" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "reservations_sequestreLiberableLe_idx" ON "reservations"("sequestreLiberableLe");

-- Acompte optionnel par défaut (paiement intégral)
ALTER TABLE "reservations" ALTER COLUMN "acomptePourcent" SET DEFAULT 0;
