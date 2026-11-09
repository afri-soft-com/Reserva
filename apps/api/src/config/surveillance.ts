import * as Sentry from "@sentry/node";

/**
 * Suivi des erreurs serveur (Sentry). Inactif tant que SENTRY_DSN n'est pas défini :
 * aucun appel réseau, aucune donnée envoyée.
 */
const dsn = process.env.SENTRY_DSN?.trim();

export const surveillanceActive = Boolean(dsn);

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.RENDER_GIT_COMMIT,
    // Erreurs seulement : pas de traces de performance ni de données personnelles.
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

/** Remonte une erreur inattendue (500) avec le contexte de la requête, sans corps ni en-têtes. */
export function signalerErreur(erreur: unknown, contexte?: { methode?: string; route?: string }) {
  if (!surveillanceActive) return;
  Sentry.captureException(erreur, { tags: contexte });
}
