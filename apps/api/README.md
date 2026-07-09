# RESERVA API — Backend

API REST pour l'application RESERVA (réservation planifiée, RDCongo).

## Stack technique

- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** via **Prisma ORM**
- **JWT** pour l'authentification
- Paiements Mobile Money et SMS en **mode simulation** par défaut (aucune clé API requise pour développer)

## Prérequis (Windows)

1. **Node.js 18+** — téléchargez depuis [nodejs.org](https://nodejs.org)
2. **PostgreSQL 14+** — téléchargez depuis [postgresql.org](https://www.postgresql.org/download/windows/)
   - Lors de l'installation, notez le mot de passe que vous définissez pour l'utilisateur `postgres`
   - Le port par défaut est `5432`
3. **Git** (optionnel mais recommandé) — [git-scm.com](https://git-scm.com/download/win)

## Installation

Ouvrez **PowerShell** ou **l'invite de commandes** à la racine du monorepo (`reserva_final/`) :

```powershell
# 1. Installer toutes les dépendances du monorepo (depuis la racine, pas depuis apps/api)
npm install

# 2. Configurer les variables d'environnement
cd apps\api
copy .env.example .env
```

Ouvrez le fichier `apps\api\.env` avec un éditeur de texte et modifiez au minimum :

```env
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/reserva?schema=public"
JWT_SECRET="une-chaine-aleatoire-longue-et-unique"
CRON_SECRET="une-autre-chaine-aleatoire-longue"
```

### Créer la base de données

Avec **pgAdmin** (installé avec PostgreSQL) ou via la ligne de commande `psql` :

```sql
CREATE DATABASE reserva;
```

### Appliquer le schéma et générer le client Prisma

Toujours depuis `apps/api` :

```powershell
npx prisma generate
npx prisma migrate dev --name init
```

### Charger les données de démonstration

```powershell
npm run db:seed
```

Cela crée des comptes de test (médecin, hôtel, compagnie de transport, clients) tous accessibles avec le **PIN 1234**. Les numéros de téléphone de test sont affichés dans la console après l'exécution.

## Démarrer le serveur

Depuis la racine du monorepo :

```powershell
npm run dev:api
```

L'API démarre sur `http://localhost:4000`. Vérifiez avec :

```
GET http://localhost:4000/api/sante
```

## Mode simulation des paiements et SMS

Par défaut (`MODE_PAIEMENT=simulation` et `MODE_SMS=simulation` dans `.env`) :

- Les codes OTP sont affichés **dans la console du serveur** au lieu d'être envoyés par SMS
- Les paiements Mobile Money sont automatiquement approuvés (~92% de réussite simulée, pour aussi tester les échecs)
- Aucune clé API d'opérateur n'est nécessaire pour développer et démontrer l'application

Pour passer en production, voir les commentaires dans :
- `src/modules/notifications/sms.adapter.ts`
- `src/modules/paiements/mobilemoney.adapter.ts`

## Explorer la base de données visuellement

```powershell
npx prisma studio
```

Ouvre une interface web sur `http://localhost:5555` pour consulter/modifier les données.

## Structure des modules

```
src/modules/
├── auth/            Inscription, OTP, PIN, connexion
├── prestataires/     Profils prestataires, validation admin, services proposés
├── services/         Recherche publique, gestion des créneaux
├── reservations/     Création, confirmation, annulation des réservations
├── paiements/        Initiation de paiement, transactions, reçus
├── avis/             Notation et avis clients
└── notifications/    Notifications in-app + rappels automatiques (SMS)
```

Chaque module suit le même schéma : `*.routes.ts` (endpoints) → `*.controller.ts` (HTTP) → `*.service.ts` (logique métier) → Prisma.

## Endpoints principaux

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/inscription` | Démarre l'inscription (envoie un OTP) |
| POST | `/api/auth/otp/verifier` | Vérifie le code OTP |
| POST | `/api/auth/pin/definir` | Définit le code PIN (retourne un token) |
| POST | `/api/auth/connexion` | Connexion par téléphone + PIN |
| GET | `/api/services` | Recherche de services (filtres ville/catégorie/prix) |
| GET | `/api/services/:id` | Détail d'un service + créneaux disponibles |
| POST | `/api/reservations` | Crée une réservation |
| POST | `/api/reservations/:id/repondre` | [Prestataire] Confirme/refuse une réservation |
| POST | `/api/reservations/annuler` | Annule une réservation (calcule le remboursement) |
| POST | `/api/paiements` | Initie un paiement Mobile Money |
| POST | `/api/avis` | Laisse un avis après une réservation terminée |
| GET | `/api/prestataires/moi/tableau-de-bord` | [Prestataire] Tableau de bord |

## Rappels automatiques (cron)

L'endpoint `POST /api/notifications/cron/rappels` envoie les rappels SMS pour les
réservations à 24h et 1h de l'échéance. Il est protégé par l'en-tête `X-Cron-Secret`
(valeur définie dans `.env`). Sous Windows, vous pouvez le déclencher périodiquement
via le **Planificateur de tâches** avec une commande `curl`, ou héberger un petit
script Node avec `node-cron` en production.

## Tests rapides avec un client HTTP

Importez le fichier `docs/RESERVA.postman_collection.json` (s'il est présent) dans
Postman ou Insomnia, ou utilisez l'extension **REST Client** de VS Code.
