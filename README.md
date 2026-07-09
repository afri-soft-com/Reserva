# RESERVA — Monorepo

Application de réservation planifiée pour la République Démocratique du Congo.
Voir `docs/cahier-des-charges.md` et les documents Word fournis séparément pour le détail
fonctionnel complet (cahier des charges, user stories, branding, PRD).

## Structure du monorepo

```
reserva_final/
├── apps/
│   ├── api/          Backend Node.js + Express + Prisma (PostgreSQL)
│   ├── web/           Frontend Next.js (clients + prestataires)
│   └── mobile/        Application Expo/React Native (clients + prestataires)
├── packages/
│   └── shared/         Types, enums, schémas de validation Zod partagés
└── docs/
```

## Démarrage rapide (Windows)

### 1. Prérequis

- **Node.js 18+** : [nodejs.org](https://nodejs.org)
- **PostgreSQL 14+** : [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
- **Expo Go** sur votre téléphone Android (pour tester le mobile)

### 2. Installation

Ouvrez PowerShell à la racine du projet :

```powershell
npm install
```

Cette commande installe les dépendances pour les 4 packages du monorepo (api, web,
mobile, shared) en une seule fois grâce aux **npm workspaces**.

### 3. Configuration de la base de données

```powershell
cd apps\api
copy .env.example .env
```

Modifiez `apps\api\.env` avec vos identifiants PostgreSQL, puis :

```powershell
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Démarrer les applications

Trois terminaux PowerShell séparés, depuis la racine :

```powershell
npm run dev:api      # Backend sur http://localhost:4000
npm run dev:web      # Frontend web sur http://localhost:3000
npm run dev:mobile    # Expo — scannez le QR code avec Expo Go
```

## Documentation détaillée

- `apps/api/README.md` — Backend : configuration, endpoints, mode simulation des paiements
- `apps/web/README.md` — Frontend web : comptes de démo, structure
- `apps/mobile/README.md` — Mobile : configuration réseau pour tester sur téléphone physique

## Périmètre fonctionnel implémenté (MVP)

✅ Authentification (inscription SMS/OTP, code PIN, connexion)
✅ Recherche de services par catégorie/ville/texte
✅ Réservation avec sélection de créneaux (gestion de la concurrence)
✅ Annulation avec calcul automatique de remboursement selon la politique du prestataire
✅ Paiement Mobile Money (M-Pesa, Airtel Money, Orange Money) en **mode simulation**
✅ Avis et notation (avec réponse du prestataire)
✅ Tableau de bord prestataire (statistiques, réservations du jour)
✅ Gestion des créneaux par le prestataire (unitaire et récurrente)
✅ Validation des prestataires par un administrateur
✅ Notifications in-app + rappels SMS automatiques (24h/1h avant)

## Mode simulation

Par défaut, **aucune clé API réelle n'est nécessaire** pour faire fonctionner
l'application de bout en bout : les SMS s'affichent dans la console du serveur, et les
paiements Mobile Money sont automatiquement approuvés (avec un taux d'échec simulé de
8% pour tester aussi ce cas). Voir `apps/api/README.md` pour passer en production.

## Prochaines étapes suggérées

- Écran d'administration web pour valider les prestataires (actuellement via API directe
  ou Prisma Studio)
- Gestion complète des services/créneaux côté prestataire sur mobile
- Intégration réelle des API M-Pesa / Airtel Money / Orange Money et d'un fournisseur SMS
- Tests automatisés (le squelette Vitest est en place côté API)
- Internationalisation lingala/swahili (Phase 2 du PRD)
