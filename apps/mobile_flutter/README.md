# RESERVA Mobile (Flutter)

Application clients & prestataires (Android / iOS).

## Prérequis

- Flutter SDK
- Plateforme démarrée : `npm run dev:platform` (gateway **:4000**)

## Deux apps (flavors)

| Flavor | Package / Bundle ID | Entrée | Rôle |
|--------|---------------------|--------|------|
| `client` | `com.reserva.client` | `lib/main.dart` | CLIENT |
| `pro` | `com.reserva.pro` | `lib/main_pro.dart` | PRESTATAIRE |

## Lancer

```bash
flutter pub get
# Client
flutter run --flavor client -t lib/main.dart --dart-define=API_URL=http://IP_DE_VOTRE_PC:4000/api
# Prestataire (RESERVA Pro)
flutter run --flavor pro -t lib/main_pro.dart --dart-define=API_URL=http://IP_DE_VOTRE_PC:4000/api
```

## Modules Vague 1

- Santé / restauration (core)
- Hôtels (recherche → hold → paiement → confirmation + QR)
- Transport bus OD (trajet → billet + QR)
- Mes voyages / réservations

CI iOS unsigned : `.github/workflows/mobile-ios.yml` (voir `docs/mobile-ios-github.md`).
