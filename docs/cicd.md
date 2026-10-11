# CI/CD RESERVA — Render + Play Store + App Store

Pipeline GitHub Actions : [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

**Dépôt de production :** [`afri-soft-com/Reserva`](https://github.com/afri-soft-com/Reserva) (branche `main`).

## Flux (branche `main`)

```
push main
  → Qualité + Sécurité + Mobile analyze/test (parallèle après qualité/sécu)
  → Régression (migrate + seed + smoke élargi + intégration + OpenAPI strict + perf + Playwright)
  → Render (API deploy)
  → Wait Render Ready (poll deploys live + ping gateway)
  → Smoke production STRICT (+ hub readiness lecture + OpenAPI + perf informatif)
  → Play Store + App Store (Client + Pro) — seulement si smoke OK
```

| Étape | Contenu |
|-------|---------|
| **Qualité** | Prisma generate, lint, **Vitest + coverage** (économie + hub/adapter paiements), builds |
| **Sécurité** | Gitleaks + npm audit (soft-fail) |
| **Mobile** | `dart analyze` + `flutter test` (Client + Pro flavor) |
| **Régression** | backup → **migrate deploy** → seed → plateforme → smoke + intégration (auth, résa, booking, KYC, **webhook HMAC**) + OpenAPI **strict** + perf + Playwright |
| **Render** | Deploy API après gates verts |
| **Wait** | `wait-render-ready.mjs` (max 15 min) |
| **Smoke prod** | Santé, auth, admin, KYC, réservations, hotels, transport, simulation — **bloque stores** |
| **Hub readiness** | `/sante` + ping HMAC hub pay (lecture seule, **pas d’USSD**) — bloquant si secrets `AFRISOFT_HUB_*` présents |
| **Stores** | Fastlane Client + Pro |

Les PR sur `main` : Qualité → Sécurité → Régression + Mobile (pas de deploy).

### Workflows annexes

| Workflow | Déclencheur | Rôle |
|----------|-------------|------|
| [`hub-smoke.yml`](../.github/workflows/hub-smoke.yml) | Manuel | Ping gateway + hub AfriSoft (HMAC) |
| [`mobile-ios.yml`](../.github/workflows/mobile-ios.yml) | Manuel / PR mobile | Build iOS unsigned (artéfacts) |

## Limites (CI ≠ zéro bug)

Le pipeline **réduit le risque**, il ne garantit pas l’absence totale de dysfonctionnements :

- Pas de paiement Mobile Money **USSD réel** à chaque push (coût / flakiness) — uniquement simulation + webhook HMAC + hub readiness lecture.
- Pas de farm devices physiques ni review policy stores (Play org account, App Review).
- Les parcours hors smoke / hors tests unitaires peuvent encore casser.
- Vérifier Render : `MODE_PAIEMENT=production`, `MODE_SMS=production`, secrets hub.

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

## Smoke élargi (lecture + écriture)

Parcours lecture [`scripts/lib/smoke-parcours.mjs`](../scripts/lib/smoke-parcours.mjs) :

- `/sante`, OpenAPI UI, login admin, profil
- pilotage, stats, réservations, prestataires
- KYC admin, exigence documents
- finances + plans + simulation tarif
- hotels + transport villes

Parcours **écriture** [`scripts/lib/smoke-parcours-ecriture.mjs`](../scripts/lib/smoke-parcours-ecriture.mjs) (bloquant, `SMOKE_WRITE=1`) :

1. Client crée réservation SANTE → pro accepte → paiement MPESA sim → annulation
2. Admin KYC `INFO_MANQUANTE` sur dossier EN_REVUE
3. Hôtel hold → payer → annuler
4. Transport billet hold → payer → annuler

Comptes seed : admin `+243900000001`, client `+243991234567`, pro `+243970000001` (PIN `1234`).

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
Hub readiness : `AFRISOFT_HUB_APP_ID`, `AFRISOFT_HUB_API_KEY` (optionnel `AFRISOFT_PAY_HUB_URL`, `AFRISOFT_SMS_HUB_URL`).

## Règle d’or

```
Qualité + Sécurité + Régression + Mobile OK
  → backup DB → migrate → deploy Render
  → wait Ready → smoke prod STRICT → hub readiness
  → seulement alors Play / App Store
```
