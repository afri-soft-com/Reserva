# Mobile Money — hub AfriSoft pour RESERVA

## Flux produit

1. Client initie un paiement (M-Pesa / Airtel / Orange) sur une réservation.
2. L’API crée une intention puis appelle `POST https://pay.afri-soft.com/v1/payments` (HMAC).
3. Le client confirme sur son téléphone (USSD / PIN). Statut local : `EN_ATTENTE`.
4. Le hub POST un webhook `payment.completed` / `payment.failed` → crédit réservation.
5. Annulation avec remboursement Mobile Money → `POST /v1/payouts` (B2C).

Devise hub : **CDF uniquement**. Les montants USD sont convertis via `TAUX_USD_CDF` (config tarification).

## Intégration technique

| Fichier | Rôle |
|---------|------|
| [`apps/api/src/modules/paiements/afrisoft-pay.hub.ts`](../apps/api/src/modules/paiements/afrisoft-pay.hub.ts) | Client HMAC + vérif webhook |
| [`apps/api/src/modules/paiements/mobilemoney.adapter.ts`](../apps/api/src/modules/paiements/mobilemoney.adapter.ts) | Simulation / production |
| [`apps/api/src/modules/paiements/paiements.service.ts`](../apps/api/src/modules/paiements/paiements.service.ts) | Ledger réservation + webhook |
| Webhook | `POST /api/paiements/webhooks/afrisoft` |

Ne **jamais** appeler SerdiPay / CinetPay depuis Render ou l’API RESERVA (IP non whitelistée) — uniquement le hub VPS AfriSoft.

## Variables (`apps/api/.env`)

```env
MODE_PAIEMENT=simulation   # local : succès immédiat (pas d’appel hub)
# MODE_PAIEMENT=production
AFRISOFT_PAY_HUB_URL=https://pay.afri-soft.com
AFRISOFT_HUB_APP_ID=reserva          # fourni à l’onboarding AfriSoft
AFRISOFT_HUB_API_KEY=                # jamais committer
AFRISOFT_HUB_WEBHOOK_SECRET=         # optionnel ; sinon = API_KEY
```

Même `AFRISOFT_HUB_APP_ID` / `API_KEY` que pour le SMS OTP si AfriSoft a provisionné un seul app_id multi-produit.

## Webhook à enregistrer chez AfriSoft

```
https://<votre-api>/api/paiements/webhooks/afrisoft
```

Alias accepté : `/api/paiements/webhooks/afrisoft-payments`.

Headers attendus : `X-AfriSoft-Timestamp`, `X-AfriSoft-Signature`, `X-AfriSoft-App-Id`, `X-AfriSoft-Event`.

Règles côté API :

1. Vérifier HMAC (timing-safe, skew ≤ 300 s)
2. Idempotence sur `reference` / `payment_id`
3. Fail-closed si `amount_cdf` ≠ montant converti de la transaction
4. Créditer la réservation **uniquement** sur `COMPLETED`

## Opérateurs

| RESERVA | telecom hub |
|---------|-------------|
| `MPESA` | `MP` |
| `AIRTEL_MONEY` | `AM` |
| `ORANGE_MONEY` | `OM` |
| `ESPECES` | (pas de hub) |

Minimum hub : **500 FC** (plancher SerdiPay prod souvent ≥ 2 300 FC).

## Lien OTP SMS

Voir [`otp-afrisoft-sms.md`](./otp-afrisoft-sms.md) — même modèle HMAC, hub `sms.afri-soft.com`.
