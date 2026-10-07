# Guide secrets Play Store & App Store

Prépare les fichiers **en local**, puis envoie-les (ou leurs chemins) à l’agent / colle-les via `gh secret set`.  
Ne les committe **jamais** dans Git.

---

## A. Play Store (Android)

### 1. Compte de service Google Play (`PLAY_SERVICE_ACCOUNT_JSON`)

1. [Google Cloud Console](https://console.cloud.google.com/) → projet lié à Play  
2. **IAM → Comptes de service** → Créer (ex. `reserva-play-ci`)  
3. Clé → **Créer une clé JSON** → télécharger `play-service-account.json`  
4. [Play Console](https://play.google.com/console) → **Paramètres → Accès à l’API**  
5. Lier le compte de service + droits : *Admin des versions* (ou au minimum release sur les apps Client/Pro)

```powershell
# Enregistrer le secret (contenu du JSON)
Get-Content .\play-service-account.json -Raw | gh secret set PLAY_SERVICE_ACCOUNT_JSON -R afri-soft-com/Reserva
```

### 2. Keystore d’upload (`ANDROID_KEYSTORE_*`)

Si tu n’as pas encore de keystore :

```powershell
keytool -genkeypair -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Puis :

```powershell
# Base64 du .jks (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\upload-keystore.jks")) | gh secret set ANDROID_KEYSTORE_BASE64 -R afri-soft-com/Reserva

gh secret set ANDROID_KEYSTORE_PASSWORD -R afri-soft-com/Reserva -b "TON_MOT_DE_PASSE_KEYSTORE"
gh secret set ANDROID_KEY_ALIAS -R afri-soft-com/Reserva -b "upload"
gh secret set ANDROID_KEY_PASSWORD -R afri-soft-com/Reserva -b "TON_MOT_DE_PASSE_CLE"
```

### 3. OAuth Google (optionnel apps)

```powershell
gh secret set GOOGLE_SERVER_CLIENT_ID -R afri-soft-com/Reserva -b "xxxxx.apps.googleusercontent.com"
```

**Packages attendus :** `com.reserva.client` · `com.reserva.pro`  
Crée les apps dans Play Console avant le premier upload CI (ou upload manuel d’une AAB une fois).

---

## B. App Store (iOS)

### 1. Clé API App Store Connect (`.p8`)

1. [App Store Connect](https://appstoreconnect.apple.com/) → **Users and Access → Integrations → App Store Connect API**  
2. **+** → générer une clé (rôle *App Manager* ou *Admin*)  
3. Noter **Key ID** + **Issuer ID**, télécharger `AuthKey_XXXX.p8` (une seule fois)

```powershell
gh secret set APP_STORE_CONNECT_API_KEY_ID -R afri-soft-com/Reserva -b "XXXXXXXXXX"
gh secret set APP_STORE_CONNECT_ISSUER_ID -R afri-soft-com/Reserva -b "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
Get-Content .\AuthKey_XXXX.p8 -Raw | gh secret set APP_STORE_CONNECT_API_KEY_P8 -R afri-soft-com/Reserva
```

### 2. Team ID

[developer.apple.com/account](https://developer.apple.com/account) → Membership → **Team ID**

```powershell
gh secret set APPLE_TEAM_ID -R afri-soft-com/Reserva -b "XXXXXXXXXX"
```

### 3. Certificat Distribution (`.p12`)

1. Apple Developer → **Certificates** → *Apple Distribution* (créer si besoin)  
2. Exporter depuis **Trousseau d’accès** (Mac) en `.p12` avec mot de passe  

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\distribution.p12")) | gh secret set IOS_CERTIFICATE_BASE64 -R afri-soft-com/Reserva
gh secret set IOS_CERTIFICATE_PASSWORD -R afri-soft-com/Reserva -b "MOT_DE_PASSE_P12"
```

### 4. Profil provisioning App Store (`.mobileprovision`)

1. Apple Developer → **Profiles** → App Store pour `com.reserva.client` (et un pour `com.reserva.pro` si séparés)  
2. Télécharger le `.mobileprovision`

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\Reserva_Client_AppStore.mobileprovision")) | gh secret set IOS_PROVISION_PROFILE_BASE64 -R afri-soft-com/Reserva
```

> Si Client et Pro ont des profils distincts, dis-le : on pourra splitter en deux secrets (`_CLIENT` / `_PRO`).

**Bundle IDs :** `com.reserva.client` · `com.reserva.pro`

---

## C. Checklist « prêt pour l’agent »

Place ces fichiers dans un dossier local (ex. `C:\Secrets\Reserva\`) et indique le chemin :

| Fichier | Secret GitHub |
|---------|----------------|
| `play-service-account.json` | `PLAY_SERVICE_ACCOUNT_JSON` |
| `upload-keystore.jks` + mots de passe + alias | `ANDROID_KEYSTORE_*` |
| `AuthKey_xxx.p8` + Key ID + Issuer ID | `APP_STORE_CONNECT_*` |
| Team ID | `APPLE_TEAM_ID` |
| `distribution.p12` + password | `IOS_CERTIFICATE_*` |
| `*.mobileprovision` | `IOS_PROVISION_PROFILE_BASE64` |

Dès que c’est prêt : *« les fichiers sont dans C:\Secrets\Reserva »* — l’agent pourra les pousser en secrets GitHub.

---

## D. Ce qui est déjà fait (sans toi)

Render + smoke : `RENDER_API_KEY`, IDs services, `GATEWAY_URL`, `SMOKE_ADMIN_*` — déjà sur GitHub.
