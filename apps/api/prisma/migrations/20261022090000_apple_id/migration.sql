-- Sign in with Apple (App Store guideline 4.8)
ALTER TABLE "utilisateurs" ADD COLUMN IF NOT EXISTS "appleId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "utilisateurs_appleId_key" ON "utilisateurs"("appleId");
