# RESERVA Mobile (Flutter)

Application clients & prestataires (Android / iOS).

## Prérequis

- Flutter SDK
- Plateforme démarrée : `npm run dev:platform` (gateway **:4000**)

## Lancer

```bash
flutter pub get
# Émulateur Android (défaut dans lib/config.dart)
flutter run

# Appareil physique / iOS sim
flutter run --dart-define=API_URL=http://IP_DE_VOTRE_PC:4000/api
```

## Modules Vague 1

- Santé / restauration (core)
- Hôtels (recherche → hold → paiement → confirmation + QR)
- Transport bus OD (trajet → billet + QR)
- Mes voyages / réservations

CI iOS unsigned : `.github/workflows/mobile-ios.yml` (voir `docs/mobile-ios-github.md`).
