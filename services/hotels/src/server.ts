import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { completerDisponibilitesCatalogue } from "./modules/hotels.service";

const UN_JOUR_MS = 24 * 60 * 60 * 1000;

/** Garde 12 mois de nuits réservables pour chaque chambre (n'empêche jamais le démarrage). */
async function completerDisponibilites() {
  try {
    const { chambres, nuitsAjoutees } = await completerDisponibilitesCatalogue();
    console.log(`[HOTELS] disponibilités : ${nuitsAjoutees} nuit(s) ajoutée(s) sur ${chambres} chambre(s)`);
  } catch (e) {
    console.error("[HOTELS] complément des disponibilités impossible :", (e as Error).message);
  }
}

async function demarrer() {
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`✓ Service hotels sur http://localhost:${env.PORT}`);
  });
  void completerDisponibilites();
  setInterval(() => void completerDisponibilites(), UN_JOUR_MS).unref();
}

demarrer().catch((e) => {
  console.error(e);
  process.exit(1);
});
