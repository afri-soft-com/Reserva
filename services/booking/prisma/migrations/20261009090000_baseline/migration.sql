-- CreateTable
CREATE TABLE "sejours_hotel" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "hotelNom" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "typeChambreId" TEXT NOT NULL,
    "chambreNom" TEXT NOT NULL,
    "planTarifId" TEXT NOT NULL,
    "tarifNom" TEXT NOT NULL,
    "arrivee" TEXT NOT NULL,
    "depart" TEXT NOT NULL,
    "nuits" INTEGER NOT NULL,
    "adultes" INTEGER NOT NULL,
    "enfants" INTEGER NOT NULL DEFAULT 0,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "montantChambre" DOUBLE PRECISION NOT NULL,
    "montantFrais" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "montantPaye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "devise" TEXT NOT NULL DEFAULT 'USD',
    "statut" TEXT NOT NULL DEFAULT 'HOLD',
    "statutPaiement" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "expireLe" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sejours_hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_sejour" (
    "id" TEXT NOT NULL,
    "sejourId" TEXT NOT NULL,
    "operateur" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "referenceExterne" TEXT,
    "telephonePaiement" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_sejour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billets_transport" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trajetId" TEXT NOT NULL,
    "operateurNom" TEXT NOT NULL,
    "origine" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "dateDepart" TEXT NOT NULL,
    "heureDepart" TEXT NOT NULL,
    "dureeMinutes" INTEGER NOT NULL,
    "places" INTEGER NOT NULL DEFAULT 1,
    "montantBase" DOUBLE PRECISION NOT NULL,
    "montantFrais" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "montantPaye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "statut" TEXT NOT NULL DEFAULT 'HOLD',
    "statutPaiement" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "expireLe" TIMESTAMP(3) NOT NULL,
    "qrCode" TEXT,
    "notes" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billets_transport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_billet" (
    "id" TEXT NOT NULL,
    "billetId" TEXT NOT NULL,
    "operateur" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "referenceExterne" TEXT,
    "telephonePaiement" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_billet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sejours_hotel_numero_key" ON "sejours_hotel"("numero");

-- CreateIndex
CREATE INDEX "sejours_hotel_clientId_statut_idx" ON "sejours_hotel"("clientId", "statut");

-- CreateIndex
CREATE INDEX "paiements_sejour_sejourId_idx" ON "paiements_sejour"("sejourId");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_sejour_referenceExterne_key" ON "paiements_sejour"("referenceExterne");

-- CreateIndex
CREATE UNIQUE INDEX "billets_transport_numero_key" ON "billets_transport"("numero");

-- CreateIndex
CREATE INDEX "billets_transport_clientId_statut_idx" ON "billets_transport"("clientId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_billet_referenceExterne_key" ON "paiements_billet"("referenceExterne");

-- CreateIndex
CREATE INDEX "paiements_billet_billetId_idx" ON "paiements_billet"("billetId");

-- AddForeignKey
ALTER TABLE "paiements_sejour" ADD CONSTRAINT "paiements_sejour_sejourId_fkey" FOREIGN KEY ("sejourId") REFERENCES "sejours_hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_billet" ADD CONSTRAINT "paiements_billet_billetId_fkey" FOREIGN KEY ("billetId") REFERENCES "billets_transport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

