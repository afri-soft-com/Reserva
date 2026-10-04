import { PrismaClient } from "../src/generated/prisma";
import { formaterJour } from "@reserva/service-kit";

const prisma = new PrismaClient();

function joursSuivants(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    out.push(formaterJour(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

async function main() {
  await prisma.trajet.deleteMany();
  await prisma.ligne.deleteMany();
  await prisma.operateur.deleteMany();

  const ops = await Promise.all([
    prisma.operateur.create({ data: { nom: "TransCongo Express", telephone: "+243970111111", noteMoyenne: 4.4 } }),
    prisma.operateur.create({ data: { nom: "Bus Congo Star", telephone: "+243970222222", noteMoyenne: 4.1 } }),
    prisma.operateur.create({ data: { nom: "Kivu Lines", telephone: "+243970333333", noteMoyenne: 4.6 } }),
  ]);

  const lignesData = [
    { origine: "Kinshasa", destination: "Matadi", distanceKm: 350, prix: 45000, duree: 480, ops: [0, 1] },
    { origine: "Matadi", destination: "Kinshasa", distanceKm: 350, prix: 45000, duree: 480, ops: [0, 1] },
    { origine: "Kinshasa", destination: "Lubumbashi", distanceKm: 1900, prix: 180000, duree: 2160, ops: [1] },
    { origine: "Lubumbashi", destination: "Kinshasa", distanceKm: 1900, prix: 180000, duree: 2160, ops: [1] },
    { origine: "Goma", destination: "Bukavu", distanceKm: 200, prix: 35000, duree: 360, ops: [2] },
    { origine: "Bukavu", destination: "Goma", distanceKm: 200, prix: 35000, duree: 360, ops: [2] },
  ];

  const heures = ["06:00", "09:30", "14:00", "20:00"];
  const jours = joursSuivants(21);

  for (const ld of lignesData) {
    const ligne = await prisma.ligne.create({
      data: { origine: ld.origine, destination: ld.destination, distanceKm: ld.distanceKm },
    });
    for (const jour of jours) {
      for (const h of heures.slice(0, ld.origine === "Kinshasa" && ld.destination === "Lubumbashi" ? 2 : 3)) {
        for (const opIdx of ld.ops) {
          const confort = h === "20:00" ? "VIP" : "STANDARD";
          const maj = confort === "VIP" ? 1.35 : 1;
          await prisma.trajet.create({
            data: {
              ligneId: ligne.id,
              operateurId: ops[opIdx].id,
              dateDepart: jour,
              heureDepart: h,
              dureeMinutes: ld.duree,
              confort,
              prix: Math.round(ld.prix * maj),
              devise: "CDF",
              placesTotales: confort === "VIP" ? 18 : 45,
              remboursable: confort !== "VIP",
              delaiAnnulHeures: confort === "VIP" ? 24 : 12,
            },
          });
        }
      }
    }
  }

  const count = await prisma.trajet.count();
  console.log(`✓ Transport: ${ops.length} opérateurs, ${lignesData.length} lignes, ${count} trajets`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
