const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const p = new PrismaClient();

async function main() {
  const pin = await bcrypt.hash("1234", 10);
  let agent = await p.utilisateur.findUnique({ where: { telephone: "+243960000001" } });
  if (!agent) {
    agent = await p.utilisateur.create({
      data: {
        telephone: "+243960000001",
        nom: "Agent Quartier Gombe",
        role: "AGENT",
        telephoneVerifie: true,
        pinHash: pin,
        commissionAgentPourcent: 2,
        codeParrainage: "AGENTGO",
      },
    });
    console.log("agent created", agent.telephone);
  } else {
    await p.utilisateur.update({
      where: { id: agent.id },
      data: { role: "AGENT", commissionAgentPourcent: 2, pinHash: pin },
    });
    console.log("agent updated", agent.telephone);
  }

  const clinique = await p.prestataire.findFirst({ where: { nomEntreprise: { contains: "Bonne" } } });
  if (clinique) {
    await p.prestataire.update({
      where: { id: clinique.id },
      data: {
        badgeVerifieTerrain: true,
        scoreConfiance: 88,
        tauxCompletionPourcent: 95,
        tauxPonctualitePourcent: 92,
      },
    });
    const svc = await p.serviceOffert.findFirst({ where: { prestataireId: clinique.id } });
    const exist = await p.packageService.findFirst({ where: { estCorridor: true } });
    if (!exist && svc) {
      await p.packageService.create({
        data: {
          prestataireId: clinique.id,
          nom: "Corridor province → Kin (soins)",
          description: "Pack corridor mock",
          prix: 45000,
          devise: "CDF",
          estCorridor: true,
          corridorOrigine: "Mbuji-Mayi",
          corridorDestination: "Kinshasa",
          services: { create: [{ serviceId: svc.id }] },
        },
      });
      console.log("corridor package created");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
