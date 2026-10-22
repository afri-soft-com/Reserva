# Sign in with Apple — RESERVA (App Store 4.8)

Requis dès que **Continuer avec Google** est proposé sur iOS.

## Flux

1. Flutter `sign_in_with_apple` → `identityToken` (+ nom à la 1ʳᵉ fois)
2. `POST /api/auth/apple` `{ identityToken, nom?, role }`
3. API vérifie le JWT Apple (JWKS) → crée / retrouve l'utilisateur (`appleId`)
4. Si pas de PIN → écran création PIN (comme Google)

## Configuration

1. [Apple Developer](https://developer.apple.com/) → Identifiers → App IDs `com.reserva.client` et `com.reserva.pro` → activer **Sign In with Apple**
2. Capability dans Xcode : `Runner/Runner.entitlements` (`com.apple.developer.applesignin`)
3. Render / `.env` API :
   ```env
   MODE_APPLE=production
   APPLE_CLIENT_IDS=com.reserva.client,com.reserva.pro
   ```

## Simulation locale

```env
MODE_APPLE=simulation
```

Token de test : `SIM-APPLE:email@exemple.com:Nom Complet`

## Suppression de compte (5.1.1)

- In-app : **Profil → Supprimer mon compte** → `POST /api/auth/compte/supprimer` `{ confirmation: "SUPPRIMER" }`
- Page web : `/suppression-compte`
