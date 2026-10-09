-- CreateTable
CREATE TABLE "operateurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "logoUrl" TEXT,
    "noteMoyenne" DOUBLE PRECISION NOT NULL DEFAULT 4.2,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "operateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes" (
    "id" TEXT NOT NULL,
    "origine" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "distanceKm" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lignes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trajets" (
    "id" TEXT NOT NULL,
    "ligneId" TEXT NOT NULL,
    "operateurId" TEXT NOT NULL,
    "dateDepart" TEXT NOT NULL,
    "heureDepart" TEXT NOT NULL,
    "dureeMinutes" INTEGER NOT NULL,
    "confort" TEXT NOT NULL DEFAULT 'STANDARD',
    "prix" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "placesTotales" INTEGER NOT NULL,
    "placesReservees" INTEGER NOT NULL DEFAULT 0,
    "placesVendues" INTEGER NOT NULL DEFAULT 0,
    "remboursable" BOOLEAN NOT NULL DEFAULT true,
    "delaiAnnulHeures" INTEGER NOT NULL DEFAULT 12,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "trajets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lignes_origine_destination_key" ON "lignes"("origine", "destination");

-- CreateIndex
CREATE INDEX "trajets_dateDepart_ligneId_idx" ON "trajets"("dateDepart", "ligneId");

-- AddForeignKey
ALTER TABLE "trajets" ADD CONSTRAINT "trajets_ligneId_fkey" FOREIGN KEY ("ligneId") REFERENCES "lignes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trajets" ADD CONSTRAINT "trajets_operateurId_fkey" FOREIGN KEY ("operateurId") REFERENCES "operateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

