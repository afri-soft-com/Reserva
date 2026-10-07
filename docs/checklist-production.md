# Checklist production marketplace RESERVA

## Fait (robustesse Vague 1+)

- [x] Isolation prestataire sur lookup réservation par numéro (anti-IDOR)
- [x] Inventaire hotels/transport : confirmer/libérer réservés au `SERVICE_SECRET`
- [x] Avis hôtel : `sejourId` obligatoire + unique (anti-spam)
- [x] Ranking hôtels bayésien + tri popularité + moins de N+1 dispo
- [x] Gateway timeouts / 504 JSON
- [x] Timeouts fetch inter-services booking
- [x] Paiements booking + core : idempotence (`Idempotency-Key` / `idempotencyKey`)
- [x] Unicité `referenceExterne` paiements
- [x] Audit admin (suspensions, versements)
- [x] Backup SQLite multi-services (`npm run db:backup:all`)
- [x] Web admin-only + marketplace documenté

## Demain — Mobile Money réel

- [ ] Brancher adaptateurs MPESA / Airtel / Orange en `MODE_PAIEMENT=production`
- [ ] Webhooks de confirmation (statut async EN_ATTENTE → PAYE)
- [ ] Reconciliation des `referenceExterne` opérateurs
- [ ] Secrets opérateurs hors `.env` commités (vault / CI secrets)

## Avant mise en prod publique

- [x] Pipeline CI/CD (`docs/cicd.md`) : qualité / sécurité / régression / Render / smoke / stores
- [ ] Secrets GitHub posés sur `clskas/Reserva` **et** `afri-soft-com/Reserva`
- [ ] Blueprint Render importé + Deploy Hooks branchés
- [ ] `JWT_SECRET`, `SERVICE_SECRET`, `CRON_SECRET` forts et uniques (groupe `reserva-prod`)
- [ ] SQLite → PostgreSQL (disques Render en interim)
- [ ] Domaine custom gateway / web
- [ ] Monitoring (uptime gateway `/api/sante`, logs structurés)
- [ ] Rate limits renforcés sur auth / paiement
- [ ] SMS production (`MODE_SMS=production`)
- [ ] Catalogue volume + onboarding prestataires à l’échelle
