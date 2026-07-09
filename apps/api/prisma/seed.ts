import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Suppression des données existantes...");
  await prisma.favori.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.avis.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.creneau.deleteMany();
  await prisma.serviceOffert.deleteMany();
  await prisma.abonnementPrestataire.deleteMany();
  await prisma.planAbonnement.deleteMany();
  await prisma.configurationTarification.deleteMany();
  await prisma.prestataire.deleteMany();
  await prisma.otp.deleteMany();
  await prisma.utilisateur.deleteMany();

  console.log("Création des utilisateurs de démonstration...");

  const pinHashDefaut = await bcrypt.hash("1234", 10);

  // --- Administrateur ---
  const admin = await prisma.utilisateur.create({
    data: {
      telephone: "+243900000001",
      nom: "Admin RESERVA",
      email: "admin@reserva.cd",
      role: "ADMIN",
      telephoneVerifie: true,
      pinHash: pinHashDefaut,
    },
  });

  // --- Clients ---
  const clientPatrick = await prisma.utilisateur.create({
    data: {
      telephone: "+243991234567",
      nom: "Patrick Mukendi",
      role: "CLIENT",
      telephoneVerifie: true,
      pinHash: pinHashDefaut,
    },
  });

  const clienteGrace = await prisma.utilisateur.create({
    data: {
      telephone: "+243981234568",
      nom: "Grâce Tshisekedi",
      role: "CLIENT",
      telephoneVerifie: true,
      pinHash: pinHashDefaut,
    },
  });

  // --- Prestataire 1 : Clinique (Santé) ---
  const utilisateurClinique = await prisma.utilisateur.create({
    data: {
      telephone: "+243970000001",
      nom: "Dr. Jean Kabila",
      role: "PRESTATAIRE",
      telephoneVerifie: true,
      pinHash: pinHashDefaut,
    },
  });

  const clinique = await prisma.prestataire.create({
    data: {
      utilisateurId: utilisateurClinique.id,
      nomEntreprise: "Clinique Bonne Santé",
      categorie: "SANTE",
      ville: "Kinshasa",
      quartier: "Gombe",
      adresse: "12 Avenue de la Paix, Gombe",
      description: "Clinique généraliste avec consultations médicales et laboratoire d'analyses.",
      statut: "APPROUVE",
      noteMoyenne: 4.5,
      nombreAvis: 12,
      latitude: -4.3050,
      longitude: 15.3050,
    },
  });

  const consultationGenerale = await prisma.serviceOffert.create({
    data: {
      prestataireId: clinique.id,
      nom: "Consultation médecine générale",
      description: "Consultation avec un médecin généraliste, 30 minutes",
      dureeMinutes: 30,
      prix: 15000,
      devise: "CDF",
    },
  });

  // --- Prestataire 2 : Compagnie de transport ---
  const utilisateurTransport = await prisma.utilisateur.create({
    data: {
      telephone: "+243970000002",
      nom: "Société Transport Congo",
      role: "PRESTATAIRE",
      telephoneVerifie: true,
      pinHash: pinHashDefaut,
    },
  });

  const compagnieBus = await prisma.prestataire.create({
    data: {
      utilisateurId: utilisateurTransport.id,
      nomEntreprise: "Trans-Congo Voyages",
      categorie: "TRANSPORT",
      ville: "Kinshasa",
      quartier: "Limete",
      adresse: "Gare routière de Limete",
      description: "Trajets interurbains réguliers Kinshasa - Matadi - Boma",
      statut: "APPROUVE",
      noteMoyenne: 4.2,
      nombreAvis: 38,
      latitude: -4.3400,
      longitude: 15.3200,
    },
  });

  const trajetMatadi = await prisma.serviceOffert.create({
    data: {
      prestataireId: compagnieBus.id,
      nom: "Trajet Kinshasa → Matadi",
      description: "Bus climatisé, départ direct, durée approximative 6h",
      dureeMinutes: 360,
      prix: 25,
      devise: "USD",
    },
  });

  // --- Prestataire 3 : Hôtel ---
  const utilisateurHotel = await prisma.utilisateur.create({
    data: {
      telephone: "+243970000003",
      nom: "Marie Lukusa",
      role: "PRESTATAIRE",
      telephoneVerifie: true,
      pinHash: pinHashDefaut,
    },
  });

  const hotel = await prisma.prestataire.create({
    data: {
      utilisateurId: utilisateurHotel.id,
      nomEntreprise: "Hôtel Fleuve Congo",
      categorie: "HOTELLERIE",
      ville: "Kinshasa",
      quartier: "Gombe",
      adresse: "45 Boulevard du 30 Juin, Gombe",
      description: "Hôtel 3 étoiles avec vue sur le fleuve Congo, idéal pour voyages d'affaires",
      statut: "APPROUVE",
      noteMoyenne: 4.7,
      nombreAvis: 56,
      delaiAnnulationGratuiteHeures: 48,
      latitude: -4.3000,
      longitude: 15.3100,
    },
  });

  const chambreDouble = await prisma.serviceOffert.create({
    data: {
      prestataireId: hotel.id,
      nom: "Chambre double standard",
      description: "Chambre climatisée avec petit-déjeuner inclus",
      dureeMinutes: 1440,
      prix: 60,
      devise: "USD",
    },
  });

  // --- Prestataire en attente de validation (pour tester le workflow admin) ---
  const utilisateurEnAttente = await prisma.utilisateur.create({
    data: {
      telephone: "+243970000004",
      nom: "Restaurant Le Fleuve",
      role: "PRESTATAIRE",
      telephoneVerifie: true,
      pinHash: pinHashDefaut,
    },
  });

  await prisma.prestataire.create({
    data: {
      utilisateurId: utilisateurEnAttente.id,
      nomEntreprise: "Restaurant Le Fleuve d'Or",
      categorie: "RESTAURATION",
      ville: "Lubumbashi",
      quartier: "Centre-ville",
      description: "Restaurant gastronomique congolais et international",
      statut: "EN_ATTENTE_VALIDATION",
      latitude: -11.6600,
      longitude: 27.4800,
    },
  });

  console.log("Création des créneaux de disponibilité...");

  const maintenant = new Date();
  const creneauxACreer: { serviceId: string; debut: Date; fin: Date; capaciteTotale: number }[] = [];

  // Créneaux de consultation médicale : 4 prochains jours ouvrés, 9h-16h toutes les 30 min
  for (let jour = 1; jour <= 5; jour++) {
    const date = new Date(maintenant);
    date.setDate(date.getDate() + jour);
    if (date.getDay() === 0) continue; // skip dimanche

    for (let heure = 9; heure < 16; heure++) {
      for (const minute of [0, 30]) {
        const debut = new Date(date);
        debut.setHours(heure, minute, 0, 0);
        const fin = new Date(debut.getTime() + 30 * 60 * 1000);
        creneauxACreer.push({ serviceId: consultationGenerale.id, debut, fin, capaciteTotale: 1 });
      }
    }
  }

  // Créneaux de bus : départs quotidiens à 7h et 13h pour les 7 prochains jours
  for (let jour = 1; jour <= 7; jour++) {
    const date = new Date(maintenant);
    date.setDate(date.getDate() + jour);
    for (const heure of [7, 13]) {
      const debut = new Date(date);
      debut.setHours(heure, 0, 0, 0);
      const fin = new Date(debut.getTime() + 360 * 60 * 1000);
      creneauxACreer.push({ serviceId: trajetMatadi.id, debut, fin, capaciteTotale: 45 });
    }
  }

  // Créneaux hôtel : disponibilité quotidienne pour les 14 prochains jours (check-in 14h)
  for (let jour = 0; jour <= 14; jour++) {
    const date = new Date(maintenant);
    date.setDate(date.getDate() + jour);
    const debut = new Date(date);
    debut.setHours(14, 0, 0, 0);
    const fin = new Date(debut.getTime() + 1440 * 60 * 1000);
    creneauxACreer.push({ serviceId: chambreDouble.id, debut, fin, capaciteTotale: 5 });
  }

  await prisma.creneau.createMany({ data: creneauxACreer });

  console.log(`✓ ${creneauxACreer.length} créneaux créés`);

  console.log("Création des plans d'abonnement...");

  const planGratuit = await prisma.planAbonnement.create({
    data: {
      nom: "Gratuit",
      description: "Pour découvrir la plateforme",
      prix: 0,
      devise: "CDF",
      dureeJours: 30,
      maxServices: 1,
      commissionReduite: null,
      fonctionnalites: JSON.stringify(["1 service actif", "Accès messagerie", "Statistiques de base"]),
      actif: true,
    },
  });

  const planPro = await prisma.planAbonnement.create({
    data: {
      nom: "Pro",
      description: "Pour les prestataires professionnels",
      prix: 25000,
      devise: "CDF",
      dureeJours: 30,
      maxServices: 10,
      commissionReduite: 0.05,
      fonctionnalites: JSON.stringify(["Jusqu'à 10 services", "Commission réduite à 5%", "Rapport PDF", "Support prioritaire"]),
      actif: true,
    },
  });

  await prisma.planAbonnement.create({
    data: {
      nom: "Premium",
      description: "Pour les grandes entreprises",
      prix: 75,
      devise: "USD",
      dureeJours: 30,
      maxServices: null,
      commissionReduite: 0.02,
      fonctionnalites: JSON.stringify(["Services illimités", "Commission réduite à 2%", "API personnalisée", "Support dédié", "Accès aux statistiques avancées"]),
      actif: true,
    },
  });

  // Abonnement pour les prestataires valides
  const prestatairesIds = await prisma.prestataire.findMany({ where: { statut: "APPROUVE" }, select: { id: true } });
  const maintenantSeed = new Date();
  const finAbonnement = new Date(maintenantSeed);
  finAbonnement.setDate(finAbonnement.getDate() + 30);
  for (const p of prestatairesIds) {
    await prisma.abonnementPrestataire.create({
      data: {
        prestataireId: p.id,
        planId: planPro.id,
        dateDebut: maintenantSeed,
        dateFin: finAbonnement,
        statut: "ACTIF",
      },
    });
  }

  console.log(`✓ ${prestatairesIds.length} abonnements actifs créés`);

  console.log("Création des configurations de tarification...");

  await prisma.configurationTarification.createMany({
    data: [
      { cle: "COMMISSION_CLIENT", valeur: "0.10", description: "Commission appliquée aux clients (10%)", type: "POURCENTAGE" },
      { cle: "COMMISSION_PRESTATAIRE", valeur: "0.08", description: "Commission par défaut prestataire (8%)", type: "POURCENTAGE" },
      { cle: "FRAIS_ANNULE", valeur: "0.15", description: "Frais de pénalité d'annulation (15%)", type: "POURCENTAGE" },
      { cle: "SEUIL_ANNULE_GRATUIT_HEURES", valeur: "24", description: "Délai annulation gratuite (heures)", type: "ENTIER" },
      { cle: "FRAIS_ENVOI_SMS", valeur: "150", description: "Coût unitaire par SMS (CDF)", type: "MONTANT" },
      { cle: "LIMITE_RECHERCHE_RADIUS_KM", valeur: "50", description: "Rayon de recherche par défaut (km)", type: "ENTIER" },
    ],
  });

  console.log("✓ 6 configurations de tarification créées");

  console.log("Création d'avis clients pour les prestataires...");

  // Avis pour la Clinique
  const avisClinique = [
    { clientId: clientPatrick.id, note: 5, commentaire: "Excellent service, métrès à l'écoute" },
    { clientId: clienteGrace.id, note: 4, commentaire: "Très bon accueil, consultation rapide" },
  ];
  for (const a of avisClinique) {
    const creneau = await prisma.creneau.findFirst({ where: { serviceId: consultationGenerale.id }, orderBy: { debut: "asc" } });
    if (creneau) {
      const resa = await prisma.reservation.create({
        data: {
          numero: `AVIS-SEED-CLINIQUE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          clientId: a.clientId,
          prestataireId: clinique.id,
          serviceId: consultationGenerale.id,
          creneauId: creneau.id,
          statut: "TERMINEE",
          statutPaiement: "PAYE",
          montantTotal: 15000,
          montantPaye: 15000,
          devise: "CDF",
        },
      });
      await prisma.avis.create({
        data: { reservationId: resa.id, clientId: a.clientId, prestataireId: clinique.id, note: a.note, commentaire: a.commentaire },
      });
    }
  }

  // Avis pour le Transport
  for (let i = 0; i < 5; i++) {
    const creneau = await prisma.creneau.findFirst({ where: { serviceId: trajetMatadi.id }, orderBy: { debut: "asc" } });
    if (creneau) {
      const resa = await prisma.reservation.create({
        data: {
          numero: `AVIS-SEED-BUS-${Date.now()}-${i}`,
          clientId: clientPatrick.id,
          prestataireId: compagnieBus.id,
          serviceId: trajetMatadi.id,
          creneauId: creneau.id,
          statut: "TERMINEE",
          statutPaiement: "PAYE",
          montantTotal: 25,
          montantPaye: 25,
          devise: "USD",
        },
      });
      await prisma.avis.create({
        data: {
          reservationId: resa.id, clientId: clientPatrick.id, prestataireId: compagnieBus.id,
          note: [5, 4, 4, 3, 5][i], commentaire: ["Voyage confortable", "À l'heure", "Propre", "Retard de 30min", "Excellent trajet"][i],
        },
      });
    }
  }

  // Avis pour l'Hôtel
  for (let i = 0; i < 6; i++) {
    const creneau = await prisma.creneau.findFirst({ where: { serviceId: chambreDouble.id }, orderBy: { debut: "asc" } });
    if (creneau) {
      const resa = await prisma.reservation.create({
        data: {
          numero: `AVIS-SEED-HOTEL-${Date.now()}-${i}`,
          clientId: [clientPatrick.id, clienteGrace.id][i % 2],
          prestataireId: hotel.id,
          serviceId: chambreDouble.id,
          creneauId: creneau.id,
          statut: "TERMINEE",
          statutPaiement: "PAYE",
          montantTotal: 60,
          montantPaye: 60,
          devise: "USD",
        },
      });
      await prisma.avis.create({
        data: {
          reservationId: resa.id, clientId: [clientPatrick.id, clienteGrace.id][i % 2], prestataireId: hotel.id,
          note: [5, 5, 4, 5, 4, 4][i], commentaire: ["Superbe vue", "Petit-déjeuner excellent", "Chambre spacieuse", "Service impeccable", "Bon rapport qualité/prix", "Literie confortable"][i],
        },
      });
    }
  }

  console.log("✓ Avis clients créés");

  console.log("Création des favoris...");

  // Favoris pour Patrick
  await prisma.favori.create({
    data: { utilisateurId: clientPatrick.id, serviceId: consultationGenerale.id },
  });
  await prisma.favori.create({
    data: { utilisateurId: clientPatrick.id, serviceId: chambreDouble.id },
  });

  // Favoris pour Grâce
  await prisma.favori.create({
    data: { utilisateurId: clienteGrace.id, serviceId: chambreDouble.id },
  });
  await prisma.favori.create({
    data: { utilisateurId: clienteGrace.id, serviceId: trajetMatadi.id },
  });

  console.log("✓ 4 favoris créés");

  console.log("Création des codes promo...");

  const maintenant = new Date();
  const finAn = new Date(maintenant.getFullYear() + 1, 11, 31);

  await prisma.codePromo.create({
    data: {
      code: "WELCOME10",
      description: "10% de réduction pour les nouveaux clients",
      type: "PERCENTAGE",
      valeur: 10,
      dateDebut: maintenant,
      dateFin: finAn,
      usageMax: 100,
      montantMin: 5000,
    },
  });

  await prisma.codePromo.create({
    data: {
      code: "RESERVA20",
      description: "20% de réduction sur toutes les réservations",
      type: "PERCENTAGE",
      valeur: 20,
      dateDebut: maintenant,
      dateFin: finAn,
      usageMax: 50,
    },
  });

  await prisma.codePromo.create({
    data: {
      code: "FLAT5K",
      description: "5 000 FC de réduction forfaitaire",
      type: "FIXED",
      valeur: 5000,
      devise: "CDF",
      dateDebut: maintenant,
      dateFin: finAn,
      usageMax: 200,
      montantMin: 15000,
    },
  });

  await prisma.codePromo.create({
    data: {
      code: "SANTE25",
      description: "25% sur les services de santé",
      type: "PERCENTAGE",
      valeur: 25,
      dateDebut: maintenant,
      dateFin: new Date(maintenant.getFullYear(), maintenant.getMonth() + 3, maintenant.getDate()),
      usageMax: 30,
      montantMin: 10000,
    },
  });

  console.log("✓ 4 codes promo créés (WELCOME10, RESERVA20, FLAT5K, SANTE25)");

  console.log("Création des réservations à venir pour les rappels...");

  // Réservation dans ~2h (pour test rappel 2h)
  const creneauProche = await prisma.creneau.findFirst({
    where: { serviceId: consultationGenerale.id, debut: { gte: new Date(Date.now() + 2 * 3600000) } },
    orderBy: { debut: "asc" },
  });
  if (creneauProche) {
    await prisma.reservation.create({
      data: {
        numero: `RAPPEL-2H-${Date.now()}`,
        clientId: clientPatrick.id,
        prestataireId: clinique.id,
        serviceId: consultationGenerale.id,
        creneauId: creneauProche.id,
        statut: "CONFIRMEE",
        statutPaiement: "EN_ATTENTE",
        montantTotal: 15000,
        devise: "CDF",
      },
    });
  }

  // Réservation dans ~24h (pour test rappel 24h)
  const creneauDemain = await prisma.creneau.findFirst({
    where: { serviceId: chambreDouble.id, debut: { gte: new Date(Date.now() + 24 * 3600000) } },
    orderBy: { debut: "asc" },
  });
  if (creneauDemain) {
    await prisma.reservation.create({
      data: {
        numero: `RAPPEL-24H-${Date.now()}`,
        clientId: clienteGrace.id,
        prestataireId: hotel.id,
        serviceId: chambreDouble.id,
        creneauId: creneauDemain.id,
        statut: "CONFIRMEE",
        statutPaiement: "PAYE",
        montantTotal: 60,
        montantPaye: 30,
        devise: "USD",
      },
    });
  }

  console.log("✓ 2 réservations à venir créées pour test rappels");

  console.log("\n=== Comptes de démonstration (PIN universel : 1234) ===");
  console.log("Admin       :", admin.telephone);
  console.log("Client 1    :", clientPatrick.telephone);
  console.log("Client 2    :", clienteGrace.telephone);
  console.log("Clinique    :", utilisateurClinique.telephone);
  console.log("Transport   :", utilisateurTransport.telephone);
  console.log("Hôtel       :", utilisateurHotel.telephone);
  console.log("En attente  :", utilisateurEnAttente.telephone, "(prestataire non encore approuvé)");
  console.log("\nSeed terminé avec succès.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
