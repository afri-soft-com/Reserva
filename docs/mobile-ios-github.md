# Build iOS via GitHub Actions (sans Mac local)

RESERVA compile l’app iOS sur les runners **macOS** de GitHub. Aucun Mac physique n’est requis pour valider le build.

## Déclenchement

- Push / PR touchant `apps/mobile_flutter/**`
- Manuel : **Actions** → **Mobile iOS** → **Run workflow**

```bash
gh workflow run "Mobile iOS" --ref master
```

## Artéfact

`RESERVA-ios-unsigned-*.zip` → `Runner.app` non signée (contrôle CI).

Téléchargement : Actions → run → Artifacts (conservé 14 jours).

## Installation sur iPhone / TestFlight

Il faudra un compte Apple Developer, puis des secrets GitHub :

| Secret | Contenu |
|--------|---------|
| `APPLE_CERTIFICATE_BASE64` | `.p12` en base64 |
| `APPLE_CERTIFICATE_PASSWORD` | mot de passe du `.p12` |
| `APPLE_PROVISIONING_PROFILE_BASE64` | `.mobileprovision` en base64 |

Bundle ID actuel : `com.reserva.reserva`.

## Fichiers CI

- `.github/workflows/mobile-ios.yml`
- `apps/mobile_flutter/ios/Podfile`
- `apps/mobile_flutter/ios/ExportOptions.plist` (préparé pour signature ultérieure)
