# Build iOS via GitHub Actions (sans Mac local)

RESERVA compile l’app iOS sur les runners **macOS** de GitHub. Aucun Mac physique n’est requis pour valider le build.

## Déclenchement

- Push / PR touchant `apps/mobile_flutter/**`
- Manuel : **Actions** → **Mobile iOS** → **Run workflow**

```bash
gh workflow run "Mobile iOS" --ref master
```

## Artéfact

`RESERVA-client-ios-unsigned.zip` + `RESERVA-pro-ios-unsigned.zip` → `Runner.app` non signées (contrôle CI).

Téléchargement : Actions → run → Artifacts (conservé 14 jours).

## Installation sur iPhone / TestFlight

Il faudra un compte Apple Developer, puis des secrets GitHub :

| Secret | Contenu |
|--------|---------|
| `APPLE_CERTIFICATE_BASE64` | `.p12` en base64 |
| `APPLE_CERTIFICATE_PASSWORD` | mot de passe du `.p12` |
| `APPLE_PROVISIONING_PROFILE_BASE64` | `.mobileprovision` en base64 |

Deux apps iOS (flavors, comme Android) :

| Flavor | Bundle ID | Nom affiché | Entrée Dart |
|--------|-----------|-------------|-------------|
| `client` | `com.reserva.client` | RESERVA | `lib/main.dart` |
| `pro` | `com.reserva.pro` | RESERVA Pro | `lib/main_pro.dart` |

```bash
flutter build ios --flavor client -t lib/main.dart --release --no-codesign
flutter build ios --flavor pro -t lib/main_pro.dart --release --no-codesign
```

## Fichiers CI

- `.github/workflows/mobile-ios.yml`
- `apps/mobile_flutter/ios/Podfile`
- `apps/mobile_flutter/ios/ExportOptions.plist` (préparé pour signature ultérieure)
