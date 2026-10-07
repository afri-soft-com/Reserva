/**
 * Ajoute 10 clients + 10 prestataires de test (PIN 1234) sans tout réinitialiser.
 * Usage: node scripts/seed-comptes-test.js
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const CLIENTS = [
  { telephone: "+243991234567", nom: "Patrick Mukendi" },
  { telephone: "+243981234568", nom: "Grâce Tshisekedi" },
  { telephone: "+243991000001", nom: "Client Test 01 — Amina Kabongo" },
  { telephone: "+243991000002", nom: "Client Test 02 — Joseph Mbayo" },
  { telephone: "+243991000003", nom: "Client Test 03 — Sarah Ilunga" },
  { telephone: "+243991000004", nom: "Client Test 04 — David Kalonji" },
  { telephone: "+243991000005", nom: "Client Test 05 — Esther Mwamba" },
  { telephone: "+243991000006", nom: "Client Test 06 — Paul Ngalamulume" },
  { telephone: "+243991000007", nom: "Client Test 07 — Chantal Oyeka" },
  { telephone: "+243991000008", nom: "Client Test 08 — Michel Banza" },
];

const PROS = [
  { telephone: "+243970000001", nom: "Dr. Jean Kabila", entreprise: "Clinique Bonne Santé", categorie: "SANTE", ville: "Kinshasa", quartier: "Gombe", statut: "APPROUVE", kyc: "VALIDE" },
  { telephone: "+243970000002", nom: "Société Transport Congo", entreprise: "Trans-Congo Voyages", categorie: "TRANSPORT", ville: "Kinshasa", quartier: "Limete", statut: "APPROUVE", kyc: "VALIDE" },
  { telephone: "+243970000003", nom: "Marie Lukusa", entreprise: "Hôtel Fleuve Congo", categorie: "HOTELLERIE", ville: "Kinshasa", quartier: "Gombe", statut: "APPROUVE", kyc: "VALIDE" },
  { telephone: "+243970000004", nom: "Restaurant Le Fleuve", entreprise: "Restaurant Le Fleuve d'Or", categorie: "RESTAURATION", ville: "Lubumbashi", quartier: "Centre-ville", statut: "APPROUVE", kyc: "EN_REVUE" },
  { telephone: "+243970000005", nom: "Pro Test 05 — Dr. Claire Mbuyi", entreprise: "Cabinet Dentaire Mbuyi", categorie: "SANTE", ville: "Kinshasa", quartier: "Ngaliema", statut: "APPROUVE", kyc: "BROUILLON" },
  { telephone: "+243970000006", nom: "Pro Test 06 — Auto Bus Est", entreprise: "Bus Est Express", categorie: "TRANSPORT", ville: "Goma", quartier: "Birere", statut: "APPROUVE", kyc: "BROUILLON" },
  { telephone: "+243970000007", nom: "Pro Test 07 — Hôtel Virunga", entreprise: "Hôtel Virunga Lodge", categorie: "HOTELLERIE", ville: "Goma", quartier: "Himbi", statut: "APPROUVE", kyc: "BROUILLON" },
  { telephone: "+243970000008", nom: "Pro Test 08 — École Horizon", entreprise: "Centre Horizon Formation", categorie: "EDUCATION", ville: "Kinshasa", quartier: "Lemba", statut: "EN_ATTENTE_VALIDATION", kyc: "BROUILLON" },
  { telephone: "+243970000009", nom: "Pro Test 09 — Salle Palais", entreprise: "Palais des Conférences", categorie: "SALLE_REUNION", ville: "Kinshasa", quartier: "Gombe", statut: "APPROUVE", kyc: "BROUILLON" },
  { telephone: "+243970000010", nom: "Pro Test 10 — Guichet Admin", entreprise: "Guichet Services Admin", categorie: "ADMINISTRATIF", ville: "Lubumbashi", quartier: "Kenya", statut: "EN_ATTENTE_VALIDATION", kyc: "BROUILLON" },
];

async function upsertClient(pinHash, c, i) {
  const exist = await prisma.utilisateur.findUnique({ where: { telephone: c.telephone } });
  if (exist) {
    await prisma.utilisateur.update({
      where: { id: exist.id },
      data: { nom: c.nom, pinHash, role: "CLIENT", telephoneVerifie: true },
    });
    return exist.id;
  }
  const u = await prisma.utilisateur.create({
    data: {
      telephone: c.telephone,
      nom: c.nom,
      role: "CLIENT",
      telephoneVerifie: true,
      pinHash,
      codeParrainage: `RESV-CLT${String(i + 1).padStart(2, "0")}-${1000 + i}`,
    },
  });
  return u.id;
}

async function upsertPro(pinHash, p, i) {
  let u = await prisma.utilisateur.findUnique({ where: { telephone: p.telephone } });
  if (!u) {
    u = await prisma.utilisateur.create({
      data: {
        telephone: p.telephone,
        nom: p.nom,
        role: "PRESTATAIRE",
        telephoneVerifie: true,
        pinHash,
        codeParrainage: `RESV-PRO${String(i + 1).padStart(2, "0")}-${2000 + i}`,
      },
    });
  } else {
    await prisma.utilisateur.update({
      where: { id: u.id },
      data: { nom: p.nom, pinHash, role: "PRESTATAIRE", telephoneVerifie: true },
    });
  }

  const profil = await prisma.prestataire.findUnique({ where: { utilisateurId: u.id } });
  if (!profil) {
    await prisma.prestataire.create({
      data: {
        utilisateurId: u.id,
        nomEntreprise: p.entreprise,
        categorie: p.categorie,
        ville: p.ville,
        quartier: p.quartier,
        description: `Compte de test — ${p.entreprise}`,
        statut: p.statut,
        kycStatut: p.kyc,
        latitude: -4.3 - i * 0.01,
        longitude: 15.3 + i * 0.01,
      },
    });
  } else {
    await prisma.prestataire.update({
      where: { id: profil.id },
      data: {
        nomEntreprise: p.entreprise,
        categorie: p.categorie,
        ville: p.ville,
        quartier: p.quartier,
        statut: p.statut,
        kycStatut: p.kyc,
      },
    });
  }
}

async function main() {
  const pinHash = await bcrypt.hash("1234", 10);

  // Admin + agent utiles pour les tests
  const adminTel = "+243900000001";
  const admin = await prisma.utilisateur.findUnique({ where: { telephone: adminTel } });
  if (admin) {
    await prisma.utilisateur.update({ where: { id: admin.id }, data: { pinHash, telephoneVerifie: true } });
  }

  console.log("\n=== APP CLIENT (Reserva Client) — PIN 1234 ===");
  for (let i = 0; i < CLIENTS.length; i++) {
    await upsertClient(pinHash, CLIENTS[i], i);
    console.log(`${String(i + 1).padStart(2, "0")}. ${CLIENTS[i].telephone}  |  ${CLIENTS[i].nom}`);
  }

  console.log("\n=== APP PRO (Reserva Pro) — PIN 1234 ===");
  for (let i = 0; i < PROS.length; i++) {
    await upsertPro(pinHash, PROS[i], i);
    console.log(
      `${String(i + 1).padStart(2, "0")}. ${PROS[i].telephone}  |  ${PROS[i].entreprise}  |  ${PROS[i].statut} / KYC ${PROS[i].kyc}`
    );
  }

  console.log("\n=== ADMIN (web / app admin) ===");
  console.log("01. +243900000001  |  Admin RESERVA  |  PIN 1234");
  console.log("\n=== AGENT (optionnel) ===");
  console.log("01. +243960000001  |  Agent Quartier  |  PIN 1234");
  console.log("\nSeed comptes test terminé.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
