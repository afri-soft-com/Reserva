# RESERVA — Plateforme de réservation (RDC)

Vague 1 livrée : **hôtels**, **bus OD**, **santé/restauration (core)**, **console admin web**, **app mobile Flutter**.

## Modèle produit : marketplace (pas multi-tenant)

RESERVA est un **marketplace mono-opérateur** (référence Trip / Booking), pas un SaaS multi-tenant white-label.

- Une seule plateforme RESERVA, un admin global
- Des **prestataires** (vendeurs) isolés via `prestataireId`
- Des **clients** qui réservent sur un catalogue partagé
- Revenus : **commission** + **frais de service** + abonnements prestataire + publicités

Pas de `Tenant` / `Organisation` / `tenantId`. Ne pas introduire de multi-tenant sauf décision produit explicite de vendre la plateforme à plusieurs opérateurs.

## Architecture

| Service | Port | Rôle |
|---------|------|------|
| Gateway | **4000** | Point d’entrée unique `/api/*` (web + mobile) |
| Core | 4101 | Auth, santé, restauration, admin, économie |
| Hotels | 4102 | Inventaire & catalogue hôtels |
| Booking | 4103 | Holds 15 min, paiements simulés, billets |
| Transport | 4104 | Trajets bus OD |
| Web admin | **3001** | Console administrateur uniquement |
| Mobile | Flutter | Clients & prestataires (Android / iOS) |

Bases : **SQLite** par service. Mobile Money / SMS en **mode simulation** en local.

## Démarrage local (recommandé)

```bash
# 1. Dépendances
npm install
npm run build:shared

# 2. Bases + seeds
npm run db:generate
npm run db:seed
npm run db:push:hotels && npm run db:seed:hotels
npm run db:push:booking
npm run db:push:transport && npm run db:seed:transport

# 3. Plateforme complète
npm run dev:platform
```

- Admin : http://localhost:3001 — `+243900000001` / PIN `1234`
- API (gateway) : http://localhost:4000/api/sante
- Mobile (**2 apps**) :  
  - Client : `npm run dev:mobile:client -- --dart-define=API_URL=http://IP_LAN:4000/api`  
  - Pro (prestataire) : `npm run dev:mobile:pro -- --dart-define=API_URL=http://IP_LAN:4000/api`  
  OTP / SMS : [`docs/otp-afrisoft-sms.md`](docs/otp-afrisoft-sms.md)

Copiez les `.env.example` vers `.env` dans `apps/api`, `apps/web`, `services/*` si besoin.

## Scripts utiles

```bash
npm run smoke:local          # Santé gateway + login admin + catalogues
npm run smoke:prod           # Smoke post-deploy (GATEWAY_URL + credentials)
npm run ci:quality           # Lint + builds
npm run ci:security          # npm audit prod
npm run db:backup:all        # Backup SQLite core/hotels/booking/transport
npm run analyze:mobile
npm run test:e2e -w apps/web # Playwright (plateforme déjà démarrée)
```

## CI/CD

Push sur **`main`** (remotes `origin` + `afri-soft-com`) → qualité → sécurité → régression → **Render** → smoke prod → **Play Store** + **App Store**.

Voir [`docs/cicd.md`](docs/cicd.md) (secrets, Blueprint Render, Fastlane).  
Checklist prod / Mobile Money : [`docs/checklist-production.md`](docs/checklist-production.md).

## Docker

`docker compose up` lance core / hotels / booking / transport / gateway / web.  
Pour le quotidien, préférer `npm run dev:platform`.

## Périmètre Vague 1

- ✅ Hold hôtel 15 min → paiement → confirmation (+ QR mobile)
- ✅ Bus OD → billet + QR
- ✅ Réservations santé (core)
- ✅ Console admin (pilotage, finances, ledger, versements, OTA…)
- ❌ Vols / suite Trip+Booking (vagues suivantes)
- ❌ Mobile Money / SMS production (adapters prêts, mode simulation)

## Remotes / branche

- Branche de déploiement : **`main`**
- `origin` → github.com/clskas/Reserva  
- `afri-soft-com` → github.com/afri-soft-com/Reserva
