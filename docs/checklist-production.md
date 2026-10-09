# Checklist production marketplace RESERVA

## Fait (robustesse Vague 1+)

- [x] Isolation prestataire sur lookup rÃ©servation par numÃ©ro (anti-IDOR)
- [x] Inventaire hotels/transport : confirmer/libÃ©rer rÃ©servÃ©s au `SERVICE_SECRET`
- [x] Avis hÃ´tel : `sejourId` obligatoire + unique (anti-spam)
- [x] Ranking hÃ´tels bayÃ©sien + tri popularitÃ© + moins de N+1 dispo
- [x] Gateway timeouts / 504 JSON
- [x] Timeouts fetch inter-services booking
- [x] Paiements booking + core : idempotence (`Idempotency-Key` / `idempotencyKey`)
- [x] UnicitÃ© `referenceExterne` paiements
- [x] Audit admin (suspensions, versements)
- [x] Backup SQLite multi-services (`npm run db:backup:all`)
- [x] Web admin-only + marketplace documentÃ©

## Mobile Money (hub AfriSoft)

- [x] Adaptateur production via pay.afri-soft.com (HMAC)
- [x] Webhooks de confirmation (EN_ATTENTE -> PAYE / ECHOUE)
- [x] Idempotence + fail-closed montant CDF
- [ ] Secrets hub poses en prod (AFRISOFT_HUB_*, MODE_PAIEMENT=production)
- [ ] Webhook URL enregistree chez AfriSoft

## Avant mise en prod publique

- [x] Pipeline CI/CD (`docs/cicd.md`) : qualitÃ© / sÃ©curitÃ© / rÃ©gression / Render / smoke / stores
- [ ] Secrets GitHub posÃ©s sur `clskas/Reserva` **et** `afri-soft-com/Reserva`
- [ ] Blueprint Render importÃ© + Deploy Hooks branchÃ©s
- [ ] `JWT_SECRET`, `SERVICE_SECRET`, `CRON_SECRET` forts et uniques (groupe `reserva-prod`)
- [ ] SQLite â†’ PostgreSQL (disques Render en interim)
- [ ] Domaine custom gateway / web
- [ ] Monitoring (uptime gateway `/api/sante`, logs structurÃ©s)
- [ ] Rate limits renforcÃ©s sur auth / paiement
- [ ] SMS production (`MODE_SMS=production`)
- [ ] Catalogue volume + onboarding prestataires Ã  lâ€™Ã©chelle

