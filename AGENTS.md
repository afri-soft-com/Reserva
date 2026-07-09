# Commandes RESERVA

## Web (Next.js)
```bash
npm run dev:web          # Démarrer le serveur web (:3000)
```

## API (Express)
```bash
npm run dev:api          # Démarrer l'API (:4000)
npm run build:shared     # Build packages/shared avant l'API
npm run db:migrate       # Migrer la base SQLite
npm run db:seed          # Charger les données de test
```

## Mobile Flutter
```bash
npm run pub:mobile       # flutter pub get
npm run analyze:mobile   # dart analyze lib/ (vérification statique)
npm run dev:mobile       # flutter run (sur émulateur connecté)

# Construire avec URL API personnalisée
cd apps/mobile_flutter && flutter run --dart-define=API_URL=http://10.0.2.2:4000/api
```

## Lint & Typecheck
```bash
npm run lint             # ESLint tous les workspaces
npx tsc --noEmit         # TypeScript (à la racine ou dans apps/api)
```

## Tests E2E (Playwright)
```bash
# Prérequis : API + Web doivent tourner + base seedée
npm run dev:api          # Terminal 1
npm run dev:web          # Terminal 2 (port 3001)

# Lancer les tests E2E
npm run test:e2e -w apps/web

# Avec interface graphique Playwright
cd apps/web && npx playwright test --ui

# Voir le rapport HTML
cd apps/web && npx playwright show-report e2e/rapport
```
