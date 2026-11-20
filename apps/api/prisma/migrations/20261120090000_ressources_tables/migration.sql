-- Mode de réservation TABLE (restaurants) : ressources physiques + nombre de couverts
ALTER TABLE "services_offerts" ADD COLUMN IF NOT EXISTS "modeReservation" TEXT NOT NULL DEFAULT 'CRENEAU';
ALTER TABLE "services_offerts" ADD COLUMN IF NOT EXISTS "prixParPersonne" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "ressources" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "capacite" INTEGER NOT NULL DEFAULT 1,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ressources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ressources_serviceId_nom_key" ON "ressources"("serviceId", "nom");
CREATE INDEX IF NOT EXISTS "ressources_serviceId_actif_idx" ON "ressources"("serviceId", "actif");

DO $$ BEGIN
  ALTER TABLE "ressources" ADD CONSTRAINT "ressources_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "services_offerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "nombrePersonnes" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "ressourceId" TEXT;
CREATE INDEX IF NOT EXISTS "reservations_ressourceId_idx" ON "reservations"("ressourceId");

DO $$ BEGIN
  ALTER TABLE "reservations" ADD CONSTRAINT "reservations_ressourceId_fkey"
    FOREIGN KEY ("ressourceId") REFERENCES "ressources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
