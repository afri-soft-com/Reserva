-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "googleId" TEXT,
    "nom" TEXT NOT NULL,
    "pinHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "photoUrl" TEXT,
    "telephoneVerifie" BOOLEAN NOT NULL DEFAULT false,
    "deuxFAActif" BOOLEAN NOT NULL DEFAULT false,
    "tentativesPin" INTEGER NOT NULL DEFAULT 0,
    "bloqueJusquA" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,
    "codeParrainage" TEXT,
    "parraineParId" TEXT,
    "commissionAgentPourcent" DOUBLE PRECISION NOT NULL DEFAULT 2,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utilise" BOOLEAN NOT NULL DEFAULT false,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestataires" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "nomEntreprise" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "quartier" TEXT NOT NULL,
    "adresse" TEXT,
    "description" TEXT,
    "documentJustificatifUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION',
    "motifRejet" TEXT,
    "kycStatut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "pieceIdentiteType" TEXT,
    "pieceIdentiteNumero" TEXT,
    "pieceIdentiteRectoUrl" TEXT,
    "pieceIdentiteVersoUrl" TEXT,
    "selfieUrl" TEXT,
    "rccm" TEXT,
    "nif" TEXT,
    "adresseLegale" TEXT,
    "documentRccmUrl" TEXT,
    "documentNifUrl" TEXT,
    "attestationUrl" TEXT,
    "kycSoumisLe" TIMESTAMP(3),
    "kycValideLe" TIMESTAMP(3),
    "kycMotifRejet" TEXT,
    "kycRevuParId" TEXT,
    "noteMoyenne" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nombreAvis" INTEGER NOT NULL DEFAULT 0,
    "scoreConfiance" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "tauxCompletionPourcent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "tauxPonctualitePourcent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "badgeVerifieTerrain" BOOLEAN NOT NULL DEFAULT false,
    "delaiAnnulationGratuiteHeures" INTEGER NOT NULL DEFAULT 24,
    "fraisAnnulationTardivePourcent" INTEGER NOT NULL DEFAULT 50,
    "tauxCommissionPourcent" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prestataires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services_offerts" (
    "id" TEXT NOT NULL,
    "prestataireId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "dureeMinutes" INTEGER NOT NULL DEFAULT 30,
    "prix" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_offerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creneaux" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "capaciteTotale" INTEGER NOT NULL DEFAULT 1,
    "capaciteReservee" INTEGER NOT NULL DEFAULT 0,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creneaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "prestataireId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "creneauId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "statutPaiement" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "montantPaye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "montantReduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsUtilises" INTEGER NOT NULL DEFAULT 0,
    "avoirUtilise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantFraisService" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantNetPrestataire" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tauxCommissionApplique" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionStatut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "notes" TEXT,
    "reservePourTiers" BOOLEAN NOT NULL DEFAULT false,
    "nomTiers" TEXT,
    "telephoneTiers" TEXT,
    "beneficiairesJson" TEXT,
    "garantieActive" BOOLEAN NOT NULL DEFAULT true,
    "garantieUtilisee" BOOLEAN NOT NULL DEFAULT false,
    "acomptePourcent" INTEGER NOT NULL DEFAULT 30,
    "agentId" TEXT,
    "motifAnnulation" TEXT,
    "codePromoId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,
    "carteCadeauId" TEXT,
    "packageId" TEXT,
    "recurrenceGroupeId" TEXT,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codes_promo" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "valeur" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "montantMin" DOUBLE PRECISION,
    "usageMax" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeParId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codes_promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "operateur" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "referenceExterne" TEXT,
    "telephonePaiement" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audits_admin" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "cibleType" TEXT,
    "cibleId" TEXT,
    "details" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audits_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avis" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "prestataireId" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "photosUrl" TEXT,
    "reponsePrestataire" TEXT,
    "modere" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favoris" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "reservationId" TEXT,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans_abonnement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "prix" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "dureeJours" INTEGER NOT NULL,
    "maxServices" INTEGER,
    "commissionReduite" DOUBLE PRECISION,
    "fonctionnalites" TEXT NOT NULL DEFAULT '[]',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonnements_prestataire" (
    "id" TEXT NOT NULL,
    "prestataireId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "montantPaye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operateurPaiement" TEXT,
    "referencePaiement" TEXT,
    "statutPaiement" TEXT NOT NULL DEFAULT 'GRATUIT',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abonnements_prestataire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecritures_comptables" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "compte" TEXT NOT NULL,
    "sens" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "prestataireId" TEXT,
    "reservationId" TEXT,
    "abonnementId" TEXT,
    "versementId" TEXT,
    "description" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecritures_comptables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versements_prestataire" (
    "id" TEXT NOT NULL,
    "prestataireId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "statut" TEXT NOT NULL DEFAULT 'DEMANDE',
    "operateur" TEXT,
    "telephonePaiement" TEXT,
    "referenceExterne" TEXT,
    "noteAdmin" TEXT,
    "demandeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versements_prestataire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configurations_tarification" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TEXTE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurations_tarification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "sujet" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "derniereLecture" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "envoyeurId" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "imageUrl" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "luLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicites" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "imageUrl" TEXT,
    "lienUrl" TEXT,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3),
    "cible" TEXT NOT NULL DEFAULT 'TOUS',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clics" INTEGER NOT NULL DEFAULT 0,
    "modeleFacturation" TEXT NOT NULL DEFAULT 'GRATUIT',
    "prixCampagne" DOUBLE PRECISION,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "annonceurNom" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publicites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_fidelite" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "montantPoints" INTEGER NOT NULL,
    "soldeApres" INTEGER NOT NULL,
    "reservationId" TEXT,
    "description" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_fidelite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartes_cadeaux" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "acheteurId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "solde" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "beneficiaireId" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateExpiration" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cartes_cadeaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages_services" (
    "id" TEXT NOT NULL,
    "prestataireId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "prix" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "estCorridor" BOOLEAN NOT NULL DEFAULT false,
    "corridorOrigine" TEXT,
    "corridorDestination" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages_services_items" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "packages_services_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avoirs" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "montantInitial" DOUBLE PRECISION NOT NULL,
    "montantRestant" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'CDF',
    "sourceReservationId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "dateExpiration" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avoirs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertes_disponibilite" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertes_disponibilite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liste_attente" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "creneauId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liste_attente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodes_indisponibles" (
    "id" TEXT NOT NULL,
    "prestataireId" TEXT NOT NULL,
    "serviceId" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "motif" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periodes_indisponibles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiaires" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "lienParente" TEXT NOT NULL DEFAULT 'AUTRE',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "litiges" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "ouvertParId" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "description" TEXT,
    "preuvesJson" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'OUVERT',
    "decision" TEXT,
    "montantAvoir" DOUBLE PRECISION,
    "trancheParId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "litiges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commandes_sms" (
    "id" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "texteBrut" TEXT NOT NULL,
    "interpreteJson" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'RECU',
    "resultat" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commandes_sms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_telephone_key" ON "utilisateurs"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_googleId_key" ON "utilisateurs"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_codeParrainage_key" ON "utilisateurs"("codeParrainage");

-- CreateIndex
CREATE INDEX "otps_utilisateurId_idx" ON "otps"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "prestataires_utilisateurId_key" ON "prestataires"("utilisateurId");

-- CreateIndex
CREATE INDEX "prestataires_categorie_ville_idx" ON "prestataires"("categorie", "ville");

-- CreateIndex
CREATE INDEX "prestataires_scoreConfiance_idx" ON "prestataires"("scoreConfiance");

-- CreateIndex
CREATE INDEX "prestataires_kycStatut_idx" ON "prestataires"("kycStatut");

-- CreateIndex
CREATE INDEX "services_offerts_prestataireId_idx" ON "services_offerts"("prestataireId");

-- CreateIndex
CREATE INDEX "creneaux_serviceId_debut_idx" ON "creneaux"("serviceId", "debut");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_numero_key" ON "reservations"("numero");

-- CreateIndex
CREATE INDEX "reservations_clientId_idx" ON "reservations"("clientId");

-- CreateIndex
CREATE INDEX "reservations_prestataireId_idx" ON "reservations"("prestataireId");

-- CreateIndex
CREATE INDEX "reservations_statut_idx" ON "reservations"("statut");

-- CreateIndex
CREATE INDEX "reservations_agentId_idx" ON "reservations"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "codes_promo_code_key" ON "codes_promo"("code");

-- CreateIndex
CREATE INDEX "transactions_reservationId_idx" ON "transactions"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_referenceExterne_key" ON "transactions"("referenceExterne");

-- CreateIndex
CREATE INDEX "audits_admin_adminId_creeLe_idx" ON "audits_admin"("adminId", "creeLe");

-- CreateIndex
CREATE INDEX "audits_admin_action_creeLe_idx" ON "audits_admin"("action", "creeLe");

-- CreateIndex
CREATE UNIQUE INDEX "avis_reservationId_key" ON "avis"("reservationId");

-- CreateIndex
CREATE INDEX "avis_prestataireId_idx" ON "avis"("prestataireId");

-- CreateIndex
CREATE UNIQUE INDEX "favoris_utilisateurId_serviceId_key" ON "favoris"("utilisateurId", "serviceId");

-- CreateIndex
CREATE INDEX "notifications_utilisateurId_lu_idx" ON "notifications"("utilisateurId", "lu");

-- CreateIndex
CREATE INDEX "abonnements_prestataire_prestataireId_idx" ON "abonnements_prestataire"("prestataireId");

-- CreateIndex
CREATE INDEX "abonnements_prestataire_planId_idx" ON "abonnements_prestataire"("planId");

-- CreateIndex
CREATE INDEX "abonnements_prestataire_statut_idx" ON "abonnements_prestataire"("statut");

-- CreateIndex
CREATE INDEX "ecritures_comptables_compte_prestataireId_idx" ON "ecritures_comptables"("compte", "prestataireId");

-- CreateIndex
CREATE INDEX "ecritures_comptables_type_creeLe_idx" ON "ecritures_comptables"("type", "creeLe");

-- CreateIndex
CREATE INDEX "ecritures_comptables_reservationId_idx" ON "ecritures_comptables"("reservationId");

-- CreateIndex
CREATE INDEX "versements_prestataire_prestataireId_statut_idx" ON "versements_prestataire"("prestataireId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "configurations_tarification_cle_key" ON "configurations_tarification"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_participants_conversationId_utilisateurId_key" ON "conversations_participants"("conversationId", "utilisateurId");

-- CreateIndex
CREATE INDEX "messages_conversationId_creeLe_idx" ON "messages"("conversationId", "creeLe");

-- CreateIndex
CREATE INDEX "points_fidelite_utilisateurId_idx" ON "points_fidelite"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "cartes_cadeaux_code_key" ON "cartes_cadeaux"("code");

-- CreateIndex
CREATE INDEX "cartes_cadeaux_acheteurId_idx" ON "cartes_cadeaux"("acheteurId");

-- CreateIndex
CREATE INDEX "cartes_cadeaux_beneficiaireId_idx" ON "cartes_cadeaux"("beneficiaireId");

-- CreateIndex
CREATE INDEX "packages_services_prestataireId_idx" ON "packages_services"("prestataireId");

-- CreateIndex
CREATE INDEX "packages_services_estCorridor_idx" ON "packages_services"("estCorridor");

-- CreateIndex
CREATE UNIQUE INDEX "packages_services_items_packageId_serviceId_key" ON "packages_services_items"("packageId", "serviceId");

-- CreateIndex
CREATE INDEX "avoirs_utilisateurId_statut_idx" ON "avoirs"("utilisateurId", "statut");

-- CreateIndex
CREATE INDEX "alertes_disponibilite_serviceId_actif_idx" ON "alertes_disponibilite"("serviceId", "actif");

-- CreateIndex
CREATE UNIQUE INDEX "alertes_disponibilite_utilisateurId_serviceId_key" ON "alertes_disponibilite"("utilisateurId", "serviceId");

-- CreateIndex
CREATE INDEX "liste_attente_creneauId_statut_idx" ON "liste_attente"("creneauId", "statut");

-- CreateIndex
CREATE INDEX "liste_attente_clientId_idx" ON "liste_attente"("clientId");

-- CreateIndex
CREATE INDEX "periodes_indisponibles_prestataireId_dateDebut_dateFin_idx" ON "periodes_indisponibles"("prestataireId", "dateDebut", "dateFin");

-- CreateIndex
CREATE INDEX "beneficiaires_utilisateurId_idx" ON "beneficiaires"("utilisateurId");

-- CreateIndex
CREATE INDEX "litiges_reservationId_idx" ON "litiges"("reservationId");

-- CreateIndex
CREATE INDEX "litiges_statut_idx" ON "litiges"("statut");

-- CreateIndex
CREATE INDEX "commandes_sms_telephone_creeLe_idx" ON "commandes_sms"("telephone", "creeLe");

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_parraineParId_fkey" FOREIGN KEY ("parraineParId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otps" ADD CONSTRAINT "otps_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestataires" ADD CONSTRAINT "prestataires_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services_offerts" ADD CONSTRAINT "services_offerts_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "prestataires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creneaux" ADD CONSTRAINT "creneaux_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services_offerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "prestataires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services_offerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_creneauId_fkey" FOREIGN KEY ("creneauId") REFERENCES "creneaux"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_codePromoId_fkey" FOREIGN KEY ("codePromoId") REFERENCES "codes_promo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_carteCadeauId_fkey" FOREIGN KEY ("carteCadeauId") REFERENCES "cartes_cadeaux"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "prestataires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoris" ADD CONSTRAINT "favoris_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoris" ADD CONSTRAINT "favoris_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services_offerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements_prestataire" ADD CONSTRAINT "abonnements_prestataire_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "prestataires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements_prestataire" ADD CONSTRAINT "abonnements_prestataire_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans_abonnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_comptables" ADD CONSTRAINT "ecritures_comptables_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "prestataires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_comptables" ADD CONSTRAINT "ecritures_comptables_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versements_prestataire" ADD CONSTRAINT "versements_prestataire_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "prestataires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations_participants" ADD CONSTRAINT "conversations_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations_participants" ADD CONSTRAINT "conversations_participants_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_envoyeurId_fkey" FOREIGN KEY ("envoyeurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_fidelite" ADD CONSTRAINT "points_fidelite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartes_cadeaux" ADD CONSTRAINT "cartes_cadeaux_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartes_cadeaux" ADD CONSTRAINT "cartes_cadeaux_beneficiaireId_fkey" FOREIGN KEY ("beneficiaireId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages_services" ADD CONSTRAINT "packages_services_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "prestataires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages_services_items" ADD CONSTRAINT "packages_services_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages_services_items" ADD CONSTRAINT "packages_services_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services_offerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoirs" ADD CONSTRAINT "avoirs_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertes_disponibilite" ADD CONSTRAINT "alertes_disponibilite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertes_disponibilite" ADD CONSTRAINT "alertes_disponibilite_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services_offerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liste_attente" ADD CONSTRAINT "liste_attente_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liste_attente" ADD CONSTRAINT "liste_attente_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services_offerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liste_attente" ADD CONSTRAINT "liste_attente_creneauId_fkey" FOREIGN KEY ("creneauId") REFERENCES "creneaux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodes_indisponibles" ADD CONSTRAINT "periodes_indisponibles_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "prestataires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodes_indisponibles" ADD CONSTRAINT "periodes_indisponibles_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services_offerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaires" ADD CONSTRAINT "beneficiaires_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "litiges" ADD CONSTRAINT "litiges_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "litiges" ADD CONSTRAINT "litiges_ouvertParId_fkey" FOREIGN KEY ("ouvertParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

