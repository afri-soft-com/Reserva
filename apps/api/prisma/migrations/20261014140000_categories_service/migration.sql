-- Catalogue admin des catégories de services
CREATE TABLE IF NOT EXISTS "categories_service" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "icone" TEXT,
    "couleur" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_service_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "categories_service_code_key" ON "categories_service"("code");
CREATE INDEX IF NOT EXISTS "categories_service_actif_ordre_idx" ON "categories_service"("actif", "ordre");

-- Seed des 7 catégories historiques (idempotent)
INSERT INTO "categories_service" ("id", "code", "libelle", "description", "ordre", "actif", "creeLe", "misAJourLe")
VALUES
  ('cat-sante-0001-0000-0000-000000000001', 'SANTE', 'Santé', 'Consultations, cliniques, laboratoires', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-transport-0000-0000-000000000002', 'TRANSPORT', 'Transport', 'Bus, trajets interurbains', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-hotellerie-000-0000-000000000003', 'HOTELLERIE', 'Hôtellerie', 'Hôtels et hébergements', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-restauration-00-0000-000000000004', 'RESTAURATION', 'Restauration', 'Restaurants et traiteurs', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-salle-reunion-0-0000-000000000005', 'SALLE_REUNION', 'Salle de réunion', 'Salles et espaces événementiels', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-administratif-0-0000-000000000006', 'ADMINISTRATIF', 'Service administratif', 'Démarches et services admin', 60, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-education-0000-0000-000000000007', 'EDUCATION', 'Éducation', 'Formations et cours', 70, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
