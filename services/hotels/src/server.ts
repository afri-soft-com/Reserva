import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

async function demarrer() {
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`✓ Service hotels sur http://localhost:${env.PORT}`);
  });
}

demarrer().catch((e) => {
  console.error(e);
  process.exit(1);
});
