const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const keys = [
  ["POINTS_PARRAINAGE", "200", "NOMBRE", "Points crédités au parrain"],
  ["VALEUR_POINT_CDF", "50", "MONTANT", "Valeur d'1 point fidélité (CDF)"],
  ["POINTS_TRANCHE_CDF", "1000", "MONTANT", "1 point tous les X CDF payés"],
  ["COMMISSION_AGENT", "2", "POURCENT", "Commission agent de quartier (%)"],
  ["PUB_CPM_CDF", "5000", "MONTANT", "Tarif pub CPM / 1000 impressions (CDF)"],
  ["PUB_CPC_CDF", "200", "MONTANT", "Tarif pub CPC / clic (CDF)"],
  ["PUB_FORFAIT_CDF", "50000", "MONTANT", "Forfait campagne pub défaut (CDF)"],
];

async function main() {
  for (const [cle, valeur, type, description] of keys) {
    const e = await p.configurationTarification.findFirst({ where: { cle } });
    if (!e) {
      await p.configurationTarification.create({ data: { cle, valeur, type, description, actif: true } });
      console.log("créé", cle);
    } else {
      console.log("existe", cle);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
