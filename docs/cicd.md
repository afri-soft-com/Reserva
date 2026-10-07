# CI/CD RESERVA — Render + Play Store + App Store

Pipeline GitHub Actions : [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

**Dépôt de production :** [`afri-soft-com/Reserva`](https://github.com/afri-soft-com/Reserva) (branche `main`).

## Flux (branche `main`)

```
push main
  → Qualité + Sécurité (parallèle)
  → Régression (vitest + smoke local + Playwright)
  → Render (Deploy Hooks)
  → Smoke production
  → Play Store (Client + Pro) + App Store (Client + Pro)
```

1. **Qualité** — `npm run ci:quality` (shared, lint, builds api/services/web)
2. **Sécurité** — `npm run ci:security` + Gitleaks
3. **Régression** — setup SQLite, plateforme éphémère, vitest, `smoke:local`, Playwright chromium
4. **Déployer Render** — Deploy Hooks (uniquement si push `main`)
5. **Smoke production** — `npm run smoke:prod` contre `GATEWAY_URL`
6. **Play Store** + **App Store** — Fastlane, flavors `client` + `pro` (après smoke prod OK)

Les PR sur `main` exécutent seulement les étapes 1–3.

Miroir optionnel : `clskas/Reserva` — mêmes secrets si utilisé. Concurrency `deploy-prod` sérialise les déploiements.

## Render

1. Dashboard Render → **New → Blueprint** → importer [`render.yaml`](../render.yaml)
2. Vérifier les URLs `*.onrender.com` (ou domaine custom)
3. Pour chaque service : Settings → **Deploy Hook** → copier l’URL
4. Désactiver l’auto-deploy Git (déjà `autoDeploy: false` dans le blueprint)
5. Seed initial prod (une fois) : shell Render sur core/hotels/transport si catalogue vide

## Secrets GitHub (les deux repos)

### Render / smoke

| Secret | Exemple |
|--------|---------|
| `RENDER_DEPLOY_HOOK_CORE` | `https://api.render.com/deploy/srv/...?key=...` |
| `RENDER_DEPLOY_HOOK_HOTELS` | idem |
| `RENDER_DEPLOY_HOOK_TRANSPORT` | idem |
| `RENDER_DEPLOY_HOOK_BOOKING` | idem |
| `RENDER_DEPLOY_HOOK_GATEWAY` | idem |
| `RENDER_DEPLOY_HOOK_WEB` | idem |
| `GATEWAY_URL` | `https://reserva-gateway.onrender.com/api` |
| `SMOKE_ADMIN_PHONE` | téléphone admin prod |
| `SMOKE_ADMIN_PIN` | PIN admin prod |
| `API_URL_PROD` | même URL gateway `/api` pour Flutter |

### Android (Play Store)

| Secret | Contenu |
|--------|---------|
| `PLAY_SERVICE_ACCOUNT_JSON` | JSON compte de service Play Console |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 upload-keystore.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe keystore |
| `ANDROID_KEY_ALIAS` | alias clé |
| `ANDROID_KEY_PASSWORD` | mot de passe clé |

Packages : `com.reserva.client` + `com.reserva.pro` — track **production**.

### iOS (App Store)

Bundle IDs : `com.reserva.client` (RESERVA) + `com.reserva.pro` (RESERVA Pro).

| Secret | Contenu |
|--------|---------|
| `APP_STORE_CONNECT_API_KEY_ID` | Key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID |
| `APP_STORE_CONNECT_API_KEY_P8` | contenu fichier `.p8` |
| `APPLE_TEAM_ID` | Team ID |
| `IOS_CERTIFICATE_BASE64` | certificat distribution `.p12` en base64 |
| `IOS_CERTIFICATE_PASSWORD` | mot de passe `.p12` |
| `IOS_PROVISION_PROFILE_BASE64` | profil App Store en base64 |

Soumission : review App Store, **pas** de release automatique (`automatic_release: false`).

## Scripts locaux

```bash
npm run ci:quality
npm run ci:security
npm run smoke:local
GATEWAY_URL=... SMOKE_ADMIN_PHONE=... SMOKE_ADMIN_PIN=... npm run smoke:prod
```

## Notes

- Mobile Money réel : demain — laisser `MODE_PAIEMENT=simulation` sur Render jusqu’au branchement.
- SQLite sur disques Render ; migration Postgres recommandée avant forte charge.
- Build iOS unsigned manuel : workflow `Mobile iOS` (`workflow_dispatch`).
