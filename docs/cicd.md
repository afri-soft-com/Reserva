# CI/CD RESERVA — Render + Play Store + App Store

Pipeline GitHub Actions : [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

**Dépôt de production :** [`afri-soft-com/Reserva`](https://github.com/afri-soft-com/Reserva) (branche `main`).

## Flux (branche `main`)

```
push main
  → Qualité + Sécurité (parallèle)
  → Régression (intégration + smoke local + Playwright)
  → Render (API) — backup Postgres (pg_dump) puis db push au démarrage
  → Smoke production
  → Play Store + App Store (Client + Pro)
```

| Étape | Contenu |
|-------|---------|
| **Qualité** | Prisma generate, lint, **unitaires** Vitest, builds |
| **Sécurité** | Gitleaks + npm audit (soft-fail) |
| **Régression** | backup → db push/seed → plateforme → smoke local + Playwright |
| **Render** | Deploy API après gates verts |
| **Smoke prod** | `smoke:prod` (santé + login) |
| **Stores** | Fastlane Client + Pro |

Les PR sur `main` : Qualité → Sécurité → Régression seulement.

## Backup avant migration (déjà en place)

| Contexte | Comportement |
|----------|----------------|
| **CI régression** | `backup-service.mjs` avant chaque `db:push` (`--allow-empty` si DB neuve) |
| **Render start** | idem dans `startCommand` (core/hotels/booking/transport) |
| **Local** | `node scripts/backup-service.mjs core` (nécessite `pg_dump`) |

**Limite actuelle :** sur Render, le dump est écrit sur le disque éphémère du conteneur → à renforcer (disque persistant `/backups` ou upload S3/R2) pour un vrai disaster recovery.

`--allow-empty` = premier déploiement OK ; en prod, si `pg_dump` échoue sans allow-empty, le démarrage doit **bloquer** (à durcir).

## Tests aujourd’hui vs à ajouter (anti-régression)

### Déjà couvert
- Lint / build TypeScript
- 1 fichier unitaire économie (`vitest`)
- Smoke API local + smoke prod (santé, auth admin)
- E2E admin Playwright (connexion / pilotage)
- Sécurité basique (gitleaks, audit)

### À ajouter — priorité pour ne pas casser la prod

| Priorité | Ajout | Pourquoi |
|----------|--------|----------|
| **P0** | Smoke prod **élargie** (réservation, KYC, hotels, paiement simulation) + **échec = stop stores** | Détecte une API prod cassée avant clients mobiles |
| **P0** | Backup prod **persistant** (disk Render ou S3) + `pg_dump` garanti dans l’image | Restauration après mauvaise migration |
| **P0** | `prisma migrate deploy` (migrations versionnées) à la place de `db push` en prod | Schéma contrôlé, rollback possible |
| **P1** | Parcours d’intégration API : auth → créer réservation → paiement sim → annulation | Cœur métier |
| **P1** | Job `flutter analyze` + `flutter test` avant Play/App Store | Apps mobiles non cassées |
| **P1** | Couverture Vitest (seuil ex. 40 % modules critiques) | Empêche les régressions silencieuses |
| **P2** | Contrat OpenAPI : réponses smoke vs schéma | Gateway / clients alignés |
| **P2** | Canary / health post-deploy (attente Ready Render + retry smoke) | Évite smoke trop tôt |
| **P2** | Perf légère (k6) non bloquante | Détecte timeouts |
| **P3** | Preview env / staging Render avant `main` | Tester hors prod |

### Règle d’or déploiement
```
Qualité + Sécurité + Régression OK
  → backup DB prod
  → migrate
  → deploy
  → smoke prod STRICT (doit être vert)
  → seulement alors Play / App Store
```
Aujourd’hui cette chaîne existe déjà ; le maillon faible est surtout **la profondeur des tests métier** (peu d’unitaires / smoke trop mince) et **la pérennité des backups**.

## Superadmin

Compte seed / démo admin :

| Champ | Valeur |
|-------|--------|
| Email | `celestinkas@gmail.com` |
| Téléphone | `+243900000001` |
| PIN | `1234` |
| Rôle | `ADMIN` (superadmin applicatif) |

## Render

1. Dashboard Render → **New → Blueprint** → importer [`render.yaml`](../render.yaml)
2. Vérifier les URLs `*.onrender.com`
3. Pour chaque service : **Deploy Hook** → secrets GitHub `RENDER_DEPLOY_HOOK_*`
4. Auto-deploy Git désactivé (`autoDeploy: false`)
5. Seed initial prod une fois si catalogue vide

## Secrets GitHub (`afri-soft-com/Reserva`)

### Render / smoke (déjà renseignés via API)

| Secret | Valeur / rôle |
|--------|----------------|
| `RENDER_API_KEY` | Clé API Render (déploie via `POST /v1/services/{id}/deploys`) |
| `RENDER_SERVICE_CORE` | ID service `reserva-core` |
| `RENDER_SERVICE_HOTELS` | ID `reserva-hotels` |
| `RENDER_SERVICE_TRANSPORT` | ID `reserva-transport` |
| `RENDER_SERVICE_BOOKING` | ID `reserva-booking` |
| `RENDER_SERVICE_GATEWAY` | ID `reserva-gateway` |
| `RENDER_SERVICE_WEB` | ID `reserva-web` |
| `GATEWAY_URL` | `https://reserva-gateway.onrender.com/api` |
| `API_URL_PROD` | idem (Flutter) |
| `SMOKE_ADMIN_PHONE` | `+243900000001` |
| `SMOKE_ADMIN_PIN` | `1234` |

URLs publiques : gateway `reserva-gateway.onrender.com`, web `reserva-web-b9au.onrender.com`, booking `reserva-booking-ogpd.onrender.com`.

### Android (Play Store)

| Secret | Contenu |
|--------|---------|
| `PLAY_SERVICE_ACCOUNT_JSON` | JSON compte de service Play Console |
| `ANDROID_KEYSTORE_BASE64` | keystore en base64 |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe keystore |
| `ANDROID_KEY_ALIAS` | alias |
| `ANDROID_KEY_PASSWORD` | mot de passe clé |

### iOS (App Store)

| Secret | Contenu |
|--------|---------|
| `APP_STORE_CONNECT_API_KEY_ID` | Key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID |
| `APP_STORE_CONNECT_API_KEY_P8` | contenu `.p8` |
| `APPLE_TEAM_ID` | Team ID (`SW53MG3W9P`) |
| `IOS_CERTIFICATE_BASE64` | `.p12` Distribution base64 |
| `IOS_CERTIFICATE_PASSWORD` | mot de passe `.p12` |
| `IOS_PROVISION_PROFILE_CLIENT_BASE64` | profil `com.reserva.client` |
| `IOS_PROVISION_PROFILE_PRO_BASE64` | profil `com.reserva.pro` |
| `IOS_PROVISION_PROFILE_BASE64` | (legacy) fallback Client |

## Scripts locaux

```bash
npm run ci:quality      # lint + unitaires + builds
npm run ci:security
npm run test:unit
npm run smoke:local     # nécessite plateforme démarrée
GATEWAY_URL=... SMOKE_ADMIN_PHONE=... SMOKE_ADMIN_PIN=... npm run smoke:prod
```

## Notes

- Secrets Render + smoke : configurés. Secrets **Play Store / App Store** : encore manquants (keystore, JSON Play, certificats Apple).
- Mobile Money réel : laisser `MODE_PAIEMENT=simulation` jusqu’au branchement.
- **PostgreSQL + Redis** : `reserva-db` + `reserva-redis` (schémas `core|hotels|booking|transport`).
- Secrets stores : voir [`docs/secrets-stores.md`](./secrets-stores.md).
