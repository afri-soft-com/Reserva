-- Mode ressources générique : choix de l'unité par le client et libellé personnalisable
ALTER TABLE "services_offerts" ADD COLUMN IF NOT EXISTS "choixRessource" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services_offerts" ADD COLUMN IF NOT EXISTS "libelleRessource" TEXT;
