# CI/CD RESERVA — Render + Play Store + App Store

Pipeline GitHub Actions : [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

**Dépôt de production :** [`afri-soft-com/Reserva`](https://github.com/afri-soft-com/Reserva) (branche `main`).

## Flux (branche `main`)

```
push main
  → Qualité + Sécurité + Mobile analyze/test (parallèle après qualité/sécu)
  → Régression (migrate + seed + smoke élargi + intégration + OpenAPI + perf + Playwright)
  → Render (API deploy)
  → Wait Render Ready (poll deploys live + ping gateway)
  → Smoke production STRICT (+ OpenAPI + perf informatif)
  → Play Store + App Store (Client + Pro) — seulement si smoke OK
```

| Étape | Contenu |
|-------|---------|
| **Qualité** | Prisma generate, lint, **Vitest + coverage**, builds |
| **Sécurité** | Gitleaks + npm audit (soft-fail) |
| **Mobile** | `dart analyze` + `flutter test` |
| **Régression** | backup → **migrate deploy** → seed → plateforme → smoke + intégration + OpenAPI + perf + Playwright |
| **Render** | Deploy API après gates verts |
| **Wait** | `wait-render-ready.mjs` (max 15 min) |
| **Smoke prod** | Santé, auth, admin, KYC, réservations, hotels, transport, simulation — **bloque stores** |
| **Stores** | Fastlane Client + Pro |

Les PR sur `main` : Qualité → Sécurité → Régression + Mobile (pas de deploy).

## Backup + migrations

| Contexte | Comportement |
|----------|----------------|
| **CI régression** | `backup-service.mjs` puis `db-migrate-service.mjs` |
| **Render start** | idem ; core a un **disk** `/var/data` → `BACKUP_DIR=/var/data/backups` |
| **pg_dump** | installé dans `buildCommand` (`postgresql-client`) |
| **Baseline** | migrations `20261009090000_baseline` (4 schémas) |
| **DB déjà via db push** | `migrate resolve --applied` puis redeploy ; fallback `MIGRATE_FALLBACK_PUSH=1` |

Local :
```bash
node scripts/backup-service.mjs core
npm run db:migrate:core
```

Prod stricte (optionnel) : `BACKUP_REQUIRE=1` pour refuser le démarrage sans dump.

## Smoke élargi

Parcours partagé [`scripts/lib/smoke-parcours.mjs`](../scripts/lib/smoke-parcours.mjs) :

- `/sante`, OpenAPI UI, login admin, profil
- pilotage, stats, réservations, prestataires
- KYC admin, exigence documents
- finances + plans + simulation tarif
- hotels + transport villes

## Superadmin

| Champ | Valeur |
|-------|--------|
| Email | `celestinkas@gmail.com` |
| Téléphone | `+243900000001` |
| PIN | `1234` |
| Rôle | `ADMIN` |

## Render

1. Blueprint [`render.yaml`](../render.yaml) (disk backups sur `reserva-core`)
2. Secrets `RENDER_API_KEY` + `RENDER_SERVICE_*`
3. `autoDeploy: false` — déploiement via CI uniquement
4. Après sync blueprint : attacher le disk si créé manuellement

## Secrets GitHub

Voir [`secrets-stores.md`](./secrets-stores.md). Smoke : `GATEWAY_URL`, `SMOKE_ADMIN_PHONE`, `SMOKE_ADMIN_PIN`.

## Règle d’or

```
Qualité + Sécurité + Régression + Mobile OK
  → backup DB → migrate → deploy Render
  → wait Ready → smoke prod STRICT
  → seulement alors Play / App Store
```
