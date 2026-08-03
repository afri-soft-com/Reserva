# Tâches planifiées (cron)

RESERVA expose des endpoints destinés à être déclenchés par un **scheduler externe**
(ex. cron-job.org, crontab, GitHub Actions). Ils sont protégés par l'en-tête
`X-Cron-Secret`, à comparer à la variable d'environnement `CRON_SECRET` du serveur API.

## Configuration

1. Définir `CRON_SECRET` dans `apps/api/.env` (ex. une chaîne aléatoire longue).
2. Configurer le scheduler externe pour appeler l'endpoint souhaité avec l'en-tête :
   ```
   X-Cron-Secret: <votre CRON_SECRET>
   ```
3. La réponse est au format habituel `{ succes: true, donnees: ... }`.

En l'absence de `CRON_SECRET` côté serveur, les endpoints cron renvoient une erreur
(explicitement levée par `apps/api/src/middlewares/cron.ts`).

## Endpoints

### Rappels de réservation (24h et 1h avant)

- **URL** : `POST /notifications/cron/rappels`
- **Fréquence recommandée** : toutes les 5 minutes (fenêtre de tolérance interne)
- **Rôle** : envoie un SMS (simulation en dev) et crée une notification in-app `RAPPEL`
  pour chaque réservation `CONFIRMEE` dont le créneau commence dans 24h ou dans 1h.

### Rapport hebdomadaire admin

- **URL** : `POST /admin/cron/rapport-hebdo`
- **Fréquence recommandée** : tous les lundis à 06h00 (heure de Kinshasa)
- **Rôle** : génère le PDF des statistiques de la semaine écoulée
  (`periode = semaine`) via PDFKit et l'enregistre dans `apps/api/rapports/`
  sous le nom `rapport-hebdomadaire-YYYY-MM-DD.pdf`.
- **Réponse** : `{ fichier, chemin, tailleOctets, genereLe }`.

### Exemples (crontab)

```cron
# Rappels toutes les 5 minutes
*/5 * * * * curl -X POST -H "X-Cron-Secret: $CRON_SECRET" http://localhost:4000/notifications/cron/rappels

# Rapport hebdomadaire chaque lundi à 06h00
0 6 * * 1 curl -X POST -H "X-Cron-Secret: $CRON_SECRET" http://localhost:4000/admin/cron/rapport-hebdo
```

## Rappels internes (autonomes)

En complément du cron externe, l'API possède un **scheduler interne**
(`apps/api/src/services/rappel.scheduler.ts`, toutes les 30 min) qui exécute la même
logique de rappels 24h / 1h au démarrage du serveur. Les deux mécanismes sont
dé-dupliqués côté notification in-app.
