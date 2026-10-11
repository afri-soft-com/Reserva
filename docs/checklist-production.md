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

## Mobile Money (hub AfriSoft)

- [x] Adaptateur production via pay.afri-soft.com (HMAC)
- [x] Webhooks de confirmation (EN_ATTENTE -> PAYE / ECHOUE)
- [x] Idempotence + fail-closed montant CDF
- [x] Tests CI : adapter + webhook HMAC (simulation) + hub readiness lecture
- [ ] Secrets hub posés en prod Render (`AFRISOFT_HUB_*`, `MODE_PAIEMENT=production`)
- [ ] Secrets hub posés en GitHub Actions (pour `hub:readiness` / workflow Hub smoke)
- [ ] Webhook URL enregistrée chez AfriSoft

## SMS OTP (hub AfriSoft)

- [x] Adaptateur production via sms.afri-soft.com
- [x] Test CI OTP sim (demande reset PIN + mauvais code)
- [ ] `MODE_SMS=production` sur Render
- [ ] Quotas / sender AfriSoft OK

## Avant mise en prod publique

- [x] Pipeline CI/CD (`docs/cicd.md`) : qualité / sécurité / régression / Render / smoke / hub readiness / stores
- [ ] Secrets GitHub posés sur `clskas/Reserva` **et** `afri-soft-com/Reserva`
- [ ] Blueprint Render importé + Deploy Hooks branchés
- [ ] `JWT_SECRET`, `SERVICE_SECRET`, `CRON_SECRET` forts et uniques (groupe `reserva-prod`)
- [ ] Domaine custom gateway / web
- [ ] Monitoring (uptime gateway `/api/sante`, logs structurés)
- [ ] Rate limits renforcés sur auth / paiement
- [ ] Catalogue volume + onboarding prestataires à l’échelle

## Play Console Requirements (hors CI)

Certaines catégories / déclarations **Financial features** exigent un compte Play **Organisation** (politique depuis août 2024).

- [ ] App content → Financial features = **My app doesn't provide any financial features** (pas « Mobile payments and digital wallets » si RESERVA n’est pas un wallet)
- [ ] Catégorie store ≠ Finance (Travel / Business / Lifestyle)
- [ ] Health / Government / VPN = No
- [ ] Si rejet « organization account » malgré déclarations correctes → [Appeal Play](https://support.google.com/googleplay/android-developer/answer/2992031) ou transfert vers compte Organisation
- [ ] Même contrôle pour `com.reserva.client` et `com.reserva.pro`

## Vérifications manuelles recommandées

```bash
# Ping gateway + hub (lecture seule)
GATEWAY_URL=https://<gateway>/api \
AFRISOFT_HUB_APP_ID=... AFRISOFT_HUB_API_KEY=... \
npm run hub:readiness

# Ou GitHub Actions → « Hub smoke (manuel) »
```
