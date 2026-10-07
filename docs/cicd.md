# CI/CD RESERVA — Render + Play Store + App Store

Pipeline GitHub Actions : [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

**Dépôt de production :** [`afri-soft-com/Reserva`](https://github.com/afri-soft-com/Reserva) (branche `main`).

## Flux (branche `main`)

```
push main
  → Qualité + Sécurité (parallèle)
  → Régression (intégration + smoke local + Playwright)
  → Render (Deploy Hooks) — backup SQLite puis db push au démarrage
  → Smoke production
  → Play Store (Client + Pro) + App Store (Client + Pro)
```

| Étape | Contenu |
|-------|---------|
| **Qualité** | build packages, Prisma generate, lint (tsc), **tests unitaires** (`vitest` API), builds api/services/web |
| **Sécurité** | Gitleaks + npm audit (audit soft-fail tant que deps critiques non upgradées) |
| **Régression** | **backup** → db push/seed → plateforme éphémère → unit + **smoke local** (intégration API) → Playwright admin |
| **Render** | Deploy API (`RENDER_API_KEY` + IDs services) après gates verts |
| **Smoke prod** | `smoke:prod` contre `GATEWAY_URL` |
| **Stores** | Fastlane Client+Pro (secrets Play/iOS encore à fournir) |

Les PR sur `main` exécutent seulement Qualité → Sécurité → Régression.

## Tests : unitaires vs intégration

| Type | Où | Commande | Exemples |
|------|-----|----------|----------|
| **Unitaires** | Qualité (+ rejoués en régression) | `npm run test:unit` | `apps/api/**/*.test.ts` (ex. tarification) |
| **Intégration / smoke** | Régression | `npm run smoke:local` | Auth admin, santé gateway, parcours API |
| **E2E UI** | Régression | Playwright chromium | Connexion admin web |
| **Smoke prod** | Après Render | `npm run smoke:prod` | Santé + login sur URL prod |

### Comment enrichir le pipeline

1. **Plus d’unitaires** — ajouter `*.test.ts` / `*.spec.ts` sous `apps/api` (Vitest) ou workspaces services ; ils passent automatiquement via `test:unit`.
2. **Tests d’intégration API** — étendre `scripts/smoke-local.mjs` (réservation, KYC, hotels/booking) ou un dossier `apps/api/tests/integration/`.
3. **Couverture** — `vitest --coverage` + seuil dans Qualité (bloquer si &lt; X %).
4. **Mobile** — job `flutter test` / `dart analyze` avant Play/App Store.
5. **Contrats** — schéma OpenAPI validé contre réponses smoke.
6. **Performance** — k6/artillery léger après smoke prod (non bloquant d’abord).
7. **Migrations** — remplacer `db push` par `prisma migrate deploy` + backup obligatoire (déjà branché via `backup-service.mjs`).

## Backup avant migration

- **CI régression** : `node scripts/backup-service.mjs <service> --allow-empty` avant chaque `db:push`.
- **Render** : même script dans `startCommand` (core/hotels/booking/transport) avant `db push`.
- **Local** : `npm run db:backup:all` ou `node scripts/backup-service.mjs core`.

`--allow-empty` évite l’échec au premier déploiement (pas encore de fichier `.db`).

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
| `APPLE_TEAM_ID` | Team ID |
| `IOS_CERTIFICATE_BASE64` | `.p12` base64 |
| `IOS_CERTIFICATE_PASSWORD` | mot de passe `.p12` |
| `IOS_PROVISION_PROFILE_BASE64` | profil App Store base64 |

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
