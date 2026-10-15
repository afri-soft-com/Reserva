import dns from "node:dns";
import { createServer } from "http";
import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { initialiserSocket } from "./socket";
import { initialiserRappels } from "./services/rappel.scheduler";

// Prefer IPv4: certains hubs SMS renvoient 503 sur le chemin IPv6 depuis Render.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  /* Node < 17 */
}

async function demarrer() {
  try {
    await prisma.$connect();
    console.log("✓ Connexion à la base de données établie");
    if (env.MODE_SMS === "production") {
      const hub = env.AFRISOFT_SMS_HUB_URL.replace(/\/$/, "");
      fetch(`${hub}/health`)
        .then(async (r) => {
          const body = await r.text().catch(() => "");
          console.log(`[Hub SMS] egress /health → ${r.status} ${body.slice(0, 120)}`);
        })
        .catch((e) => console.error(`[Hub SMS] egress /health KO:`, e instanceof Error ? e.message : e));
    }

    const { assurerClesTarificationCroissance } = await import("./modules/economie/economie.service");
    await assurerClesTarificationCroissance().catch((e) =>
      console.warn("⚠ Clés tarification croissance :", e instanceof Error ? e.message : e)
    );

    const serveur = createServer(app);
    initialiserSocket(serveur);
    initialiserRappels();

    serveur.listen(env.PORT, () => {
      console.log(`✓ RESERVA API démarrée sur http://localhost:${env.PORT}`);
      console.log(`  Environnement : ${env.NODE_ENV}`);
      console.log(`  Mode paiement : ${env.MODE_PAIEMENT}`);
      console.log(`  Mode SMS      : ${env.MODE_SMS}`);
      console.log(`  WebSocket     : activé`);
    });
  } catch (erreur) {
    console.error("✗ Échec du démarrage du serveur :", erreur);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

demarrer();
