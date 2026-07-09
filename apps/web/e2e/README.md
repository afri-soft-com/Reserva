# Tests E2E — RESERVA

## Architecture

```
apps/web/e2e/
├── playwright.config.ts    # Configuration Playwright
├── pages/                  # Page Object Models
│   ├── ConnexionPage.ts
│   └── InscriptionPage.ts
├── specs/                  # Tests
│   ├── connexion.spec.ts   # 4 tests : formulaire, login client, login admin, erreurs
│   ├── inscription.spec.ts # 3 tests : formulaire, flux complet OTP, doublon
│   └── admin.spec.ts       # 3 tests : accès refusé, stats admin, refus client
└── helpers/                # Utilitaires
    ├── db.ts               # Lecture OTP depuis SQLite
    └── attendre.ts         # Attente splash screen
```

## Prérequis

- API sur **http://localhost:4000**
- Web sur **http://localhost:3001**
- Base seedée : `npm run db:seed`

## Lancer les tests

```bash
cd apps/web
npx playwright test --config=e2e/playwright.config.ts
```

Ou depuis la racine :

```bash
npm run test:e2e -w apps/web
```

## Options utiles

```bash
# Mode UI (interface graphique)
npx playwright test --ui --config=e2e/playwright.config.ts

# Un seul fichier
npx playwright test --config=e2e/playwright.config.ts connexion.spec.ts

# Un seul test (par son nom)
npx playwright test --config=e2e/playwright.config.ts -g "se connecte avec un compte client"

# Mode debug avec inspecteur
npx playwright test --config=e2e/playwright.config.ts --debug

# Voir le rapport HTML
npx playwright show-report e2e/rapport
```

## Comptes de test (PIN : 1234)

| Rôle    | Téléphone         |
|---------|-------------------|
| Admin   | +243900000001     |
| Client  | +243991234567     |
| Client  | +243981234568     |

## Tests disponibles (11)

### Connexion
1. ✅ Affiche le formulaire de connexion
2. ✅ Se connecte avec un compte client valide → redirigé vers `/services`
3. ✅ Se connecte avec un compte admin valide → redirigé vers `/services`
4. ✅ Affiche une erreur avec un mauvais PIN
5. ✅ Affiche une erreur avec un téléphone inconnu

### Inscription
6. ✅ Affiche le formulaire d'inscription
7. ✅ Inscrit un nouvel utilisateur (formulaire → OTP → PIN → `/services`)
8. ✅ Affiche une erreur pour un téléphone déjà utilisé

### Administration
9. ✅ Affiche un message non autorisé pour un visiteur non connecté
10. ✅ Affiche les statistiques pour un admin connecté
11. ✅ Affiche un message non autorisé pour un client connecté

## Notes

- Le splash screen (`#splash-ecran`) est automatiquement attendu après chaque navigation
- Les codes OTP sont lus directement dans la base SQLite via `better-sqlite3`
- Le rate limiter API est à 100 req/15min en développement (paramétré dans `app.ts`)
- Les tests sont séquentiels (`workers: 1`) pour éviter les conflits d'état
