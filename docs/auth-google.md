# Connexion Google — RESERVA

Bouton **Continuer avec Google** (écran bienvenue), comme SENGA.

## Flux

1. Flutter `google_sign_in` → `idToken`
2. `POST /api/auth/google` `{ idToken, role: CLIENT|PRESTATAIRE }`
3. API vérifie le token (Google) → crée / retrouve l'utilisateur
4. Si **pas de PIN** → écran création PIN (sans SMS)
5. Connexions suivantes : PIN **ou** Google

## Configuration Google Cloud

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Créer **OAuth Client ID** :
   - **Web** (obligatoire pour `idToken` Android) → copier l’ID
   - **Android** : package `com.reserva.client` et `com.reserva.pro` + SHA-1
   - **iOS** : deux clients OAuth (un par app) :
     - Bundle ID `com.reserva.client` → URL scheme dans `ios/Flutter/client.xcconfig`
     - Bundle ID `com.reserva.pro` → URL scheme dans `ios/Flutter/pro.xcconfig`
3. Dans `apps/api/.env` :
   ```env
   MODE_GOOGLE=production
   GOOGLE_CLIENT_IDS=WEB_ID,ANDROID_CLIENT_ID,ANDROID_PRO_ID,IOS_CLIENT_ID,IOS_PRO_ID
   ```
4. Flutter :
   ```bash
   flutter run --flavor client -t lib/main.dart \
     --dart-define=API_URL=http://IP:4000/api \
     --dart-define=GOOGLE_SERVER_CLIENT_ID=WEB_CLIENT_ID.apps.googleusercontent.com
   flutter run --flavor pro -t lib/main_pro.dart \
     --dart-define=API_URL=http://IP:4000/api \
     --dart-define=GOOGLE_SERVER_CLIENT_ID=WEB_CLIENT_ID.apps.googleusercontent.com
   ```

SHA-1 debug :
```bash
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android
```

### Play Store (erreur Google `10` / DEVELOPER_ERROR)

Les builds **Internal / Production** sont resignées par Google Play. Il faut aussi le SHA-1 **App signing key** (pas seulement l’upload keystore) :

1. Google Cloud → **APIs & Services → Credentials** → clients OAuth **Android**
2. Pour chaque package, créer un client (ou éditer) avec le SHA-1 **App Signing** ci-dessous  
   (garder aussi debug + upload keystore)

**SHA-1 Play App Signing (extraits CI `Play signing SHA`, 2026-10-12) :**

| Package | SHA-1 |
|---------|-------|
| `com.reserva.client` | `71:7C:4A:C4:CA:A7:05:2A:8D:F0:96:6A:95:28:E2:11:10:D6:1C:F7` |
| `com.reserva.pro` | `47:75:2F:F0:5A:53:29:09:69:9D:F3:5A:26:15:41:BC:63:49:5C:23` |

Sans ces SHA-1, `PlatformException(sign_in_failed, … 10:)` persiste sur les installs Play.  
Recalcul : Actions → workflow **Play signing SHA** (manuel).

## Mode simulation (dev sans Google Cloud)

```env
MODE_GOOGLE=simulation
```

L’API accepte un token de test : `SIM-GOOGLE:email@exemple.com:Nom Complet`  
(utile pour tests API ; le bouton mobile utilise le vrai SDK Google).
