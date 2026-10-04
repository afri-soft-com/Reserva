import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { expirerHoldsExpires } from "./modules/booking.service";

async function demarrer() {
  await prisma.$connect();
  setInterval(() => {
    expirerHoldsExpires().catch((e) => console.error("[expire-holds]", e));
  }, 60_000);
  app.listen(env.PORT, () => {
    console.log(`✓ Service booking sur http://localhost:${env.PORT}`);
  });
}

demarrer().catch((e) => {
  console.error(e);
  process.exit(1);
});
