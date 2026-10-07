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
MODE_SMS=simulation   # local : log console
# MODE_SMS=production
AFRISOFT_SMS_HUB_URL=https://sms.afri-soft.com
AFRISOFT_HUB_APP_ID=afrisoft-partenaire
AFRISOFT_HUB_API_KEY=   # canal privé — jamais committer
```

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

## Sécurité

- Clés HMAC **uniquement** côté API core — jamais dans Flutter / web
- Cooldown 60 s et max 5 SMS / 15 min par utilisateur (serveur)
- Ne pas utiliser les numéros démo `2439000000xx` pour un envoi réel
