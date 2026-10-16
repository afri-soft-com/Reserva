# OTP / SMS — hub AfriSoft pour RESERVA

## Flux produit

1. **Inscription** (app Client ou RESERVA Pro) : téléphone → profil + CGU → SMS OTP (1 fois)
2. **Création PIN** 4 chiffres
3. **Connexions suivantes** : téléphone + PIN uniquement (pas de SMS, sauf 2FA / reset PIN)

## Intégration technique

- Adaptateur : [`apps/api/src/modules/notifications/sms.adapter.ts`](../apps/api/src/modules/notifications/sms.adapter.ts)
- Client HMAC : [`apps/api/src/modules/notifications/afrisoft-sms.hub.ts`](../apps/api/src/modules/notifications/afrisoft-sms.hub.ts)
- Hub : `https://sms.afri-soft.com` — `POST /v1/sms/send`
- OTP généré et stocké **dans la DB RESERVA** ; le hub ne fait que transporter le SMS

## Variables (`apps/api/.env`)

```env
MODE_SMS=simulation   # local : log console uniquement (aucun SMS réel)
# MODE_SMS=production
AFRISOFT_SMS_HUB_URL=https://sms.afri-soft.com
AFRISOFT_HUB_APP_ID=reserva   # fourni à l'onboarding AfriSoft (souvent partagé avec le pay hub)
AFRISOFT_HUB_API_KEY=         # canal privé — jamais committer
```

### Production Render (SMS réels)

Si l’app répond « code envoyé » mais **aucun SMS** n’arrive sur un numéro réel : le core est encore en `MODE_SMS=simulation` (défaut historique du blueprint).

1. Secrets GitHub : `AFRISOFT_HUB_APP_ID`, `AFRISOFT_HUB_API_KEY`, `RENDER_API_KEY`, `RENDER_SERVICE_CORE`
2. Actions → **Activer SMS production (Render)** → Run workflow  
   (script [`scripts/render-enable-sms-prod.mjs`](../scripts/render-enable-sms-prod.mjs))
3. Ou manuellement Dashboard Render → service **reserva-core** → Environment :
   - `MODE_SMS=production`
   - `AFRISOFT_HUB_APP_ID` / `AFRISOFT_HUB_API_KEY`
   - puis Manual Deploy
4. Vérifier : Actions → **Hub smoke** (HMAC lecture sms.afri-soft.com)

Paiements Mobile Money (même app_id / clé si multi-produit) : voir [`mobile-money-afrisoft-pay.md`](./mobile-money-afrisoft-pay.md).

## Deux applications (Android + iOS)

| Flavor | Entrée Dart | applicationId / Bundle ID | Rôle |
|--------|-------------|---------------------------|------|
| `client` | `lib/main.dart` | `com.reserva.client` | CLIENT |
| `pro` | `lib/main_pro.dart` | `com.reserva.pro` | PRESTATAIRE |

```bash
cd apps/mobile_flutter
flutter run --flavor client -t lib/main.dart --dart-define=API_URL=http://192.168.x.x:4000/api
flutter run --flavor pro -t lib/main_pro.dart --dart-define=API_URL=http://192.168.x.x:4000/api
```

iOS : schemes Xcode `client` / `pro` (configs `Debug-client`, `Release-pro`, etc.).

## Panne SerdiPay (`MOVA_INT_001`)

Si le hub répond `503` / `MOVA_INT_001` (« An error occor while processing the sms ») pour **tout** texte et tout numéro :

1. Ce n’est **pas** un bug du format OTP RESERVA — le provider SerdiPay côté AfriSoft refuse l’envoi.
2. L’API passe en mode dégradé : OTP **conservé** en base, réponse `smsEnvoye: false`, code loggé `[OTP CODE]` sur Render (support uniquement).
3. Escalader AfriSoft / SerdiPay (crédit SMS, sender, clés provider). Health hub `ok` ≠ envoi réel OK.
4. Diagnostic : Actions → **Diagnostiquer SMS OTP** avec un numéro réel.

## Sécurité

- Clés HMAC **uniquement** côté API core — jamais dans Flutter / web
- Cooldown 60 s et max 5 SMS / 15 min par utilisateur (serveur)
- Ne pas utiliser les numéros démo `2439000000xx` pour un envoi réel
- Ne jamais renvoyer le code OTP dans le JSON API (même en panne provider)
