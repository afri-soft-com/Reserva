-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "ville" TEXT NOT NULL,
    "quartier" TEXT NOT NULL,
    "adresse" TEXT,
    "etoiles" INTEGER NOT NULL DEFAULT 3,
    "noteMoyenne" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "noteProprete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "noteEmplacement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nombreAvis" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "commodites" TEXT NOT NULL DEFAULT '[]',
    "photos" TEXT NOT NULL DEFAULT '[]',
    "photoUrl" TEXT,
    "telephone" TEXT,
    "politiqueAnnul" TEXT NOT NULL DEFAULT 'Annulation gratuite jusqu''├á 48h avant l''arriv├⌐e.',
    "checkInHeure" TEXT NOT NULL DEFAULT '14:00',
    "checkOutHeure" TEXT NOT NULL DEFAULT '12:00',
    "prestataireId" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_chambre" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "capaciteAdultes" INTEGER NOT NULL DEFAULT 2,
    "capaciteEnfants" INTEGER NOT NULL DEFAULT 1,
    "superficieM2" INTEGER,
    "lits" TEXT NOT NULL DEFAULT '1 lit double',
    "commodites" TEXT NOT NULL DEFAULT '[]',
    "photos" TEXT NOT NULL DEFAULT '[]',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "types_chambre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans_tarif" (
    "id" TEXT NOT NULL,
    "typeChambreId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "petitDejeuner" BOOLEAN NOT NULL DEFAULT false,
    "remboursable" BOOLEAN NOT NULL DEFAULT true,
    "delaiAnnulHeures" INTEGER NOT NULL DEFAULT 48,
    "prixParNuit" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'USD',
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plans_tarif_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilites_jour" (
    "id" TEXT NOT NULL,
    "typeChambreId" TEXT NOT NULL,
    "jour" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "vendues" INTEGER NOT NULL DEFAULT 0,
    "reservees" INTEGER NOT NULL DEFAULT 0,
    "prix" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "disponibilites_jour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avis_hotel" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "clientId" TEXT,
    "auteurNom" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "noteProprete" INTEGER NOT NULL DEFAULT 0,
    "noteEmplacement" INTEGER NOT NULL DEFAULT 0,
    "commentaire" TEXT,
    "sejourId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avis_hotel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hotels_ville_actif_idx" ON "hotels"("ville", "actif");

-- CreateIndex
CREATE INDEX "hotels_noteMoyenne_idx" ON "hotels"("noteMoyenne");

-- CreateIndex
CREATE INDEX "hotels_etoiles_idx" ON "hotels"("etoiles");

-- CreateIndex
CREATE INDEX "types_chambre_hotelId_idx" ON "types_chambre"("hotelId");

-- CreateIndex
CREATE INDEX "plans_tarif_typeChambreId_idx" ON "plans_tarif"("typeChambreId");

-- CreateIndex
CREATE INDEX "disponibilites_jour_jour_idx" ON "disponibilites_jour"("jour");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilites_jour_typeChambreId_jour_key" ON "disponibilites_jour"("typeChambreId", "jour");

-- CreateIndex
CREATE UNIQUE INDEX "avis_hotel_sejourId_key" ON "avis_hotel"("sejourId");

-- CreateIndex
CREATE INDEX "avis_hotel_hotelId_creeLe_idx" ON "avis_hotel"("hotelId", "creeLe");

-- AddForeignKey
ALTER TABLE "types_chambre" ADD CONSTRAINT "types_chambre_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans_tarif" ADD CONSTRAINT "plans_tarif_typeChambreId_fkey" FOREIGN KEY ("typeChambreId") REFERENCES "types_chambre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilites_jour" ADD CONSTRAINT "disponibilites_jour_typeChambreId_fkey" FOREIGN KEY ("typeChambreId") REFERENCES "types_chambre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis_hotel" ADD CONSTRAINT "avis_hotel_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

