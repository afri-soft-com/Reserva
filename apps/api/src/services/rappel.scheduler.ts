import { genererRappels } from "./rappel.service";

let intervalle: ReturnType<typeof setInterval> | null = null;

export function initialiserRappels() {
  // Exécuter toutes les 30 minutes
  const INTERVALLE_MS = 30 * 60 * 1000;

  console.log("✓ Service de rappels automatisés activé (toutes les 30 min)");

  // Exécuter immédiatement au démarrage
  genererRappels().then((r) => {
    if (r.sms > 0 || r.whatsapp > 0) {
      console.log(`  Rappels générés au démarrage : ${r.sms} SMS`);
    }
  }).catch((e) => {
    console.error("  Erreur génération rappels (démarrage):", e.message);
  });

  intervalle = setInterval(async () => {
    try {
      const resultat = await genererRappels();
      if (resultat.sms > 0) {
        console.log(`  Rappels générés : ${resultat.sms} SMS`);
      }
    } catch (e) {
      console.error("Erreur génération rappels:", (e as Error).message);
    }
  }, INTERVALLE_MS);
}

export function arreterRappels() {
  if (intervalle) {
    clearInterval(intervalle);
    intervalle = null;
  }
}
