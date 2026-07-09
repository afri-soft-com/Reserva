# RESERVA Web

Interface web Next.js pour RESERVA — utilisable par les clients (recherche/réservation)
et les prestataires (tableau de bord, gestion des services et créneaux).

## Prérequis

- Node.js 18+
- L'API backend RESERVA démarrée (voir `apps/api/README.md`)

## Installation (Windows)

Depuis la racine du monorepo :

```powershell
npm install
cd apps\web
copy .env.local.example .env.local
```

Le fichier `.env.local` pointe par défaut vers `http://localhost:4000/api` — modifiez
`NEXT_PUBLIC_API_URL` si votre API tourne sur un autre port ou une autre machine.

## Démarrer

Depuis la racine du monorepo :

```powershell
npm run dev:web
```

Ouvrez `http://localhost:3000`.

## Comptes de démonstration

Si vous avez exécuté `npm run db:seed` côté API, vous pouvez vous connecter avec :

| Profil | Téléphone | PIN |
|---|---|---|
| Client | 0991234567 | 1234 |
| Prestataire (clinique) | 0970000001 | 1234 |
| Prestataire (transport) | 0970000002 | 1234 |
| Prestataire (hôtel) | 0970000003 | 1234 |
| Admin | 0900000001 | 1234 |

> Note : il n'existe pas encore d'interface web dédiée à l'administration (validation
> des prestataires). Pour l'instant, utilisez directement l'API (`POST /api/prestataires/admin/valider`)
> ou Prisma Studio (`npx prisma studio` dans `apps/api`) pour approuver un prestataire en attente.

## Structure

```
src/
├── app/                  Pages (Next.js App Router)
│   ├── (auth)/           Inscription, connexion
│   ├── services/         Recherche et détail des services
│   ├── reservations/     Mes réservations (client)
│   └── prestataire/      Espace prestataire (tableau de bord, services, réservations)
├── components/           Composants UI réutilisables (branding RESERVA)
└── lib/                  Client API, fonctions d'appel par domaine, store Zustand
```

## Notes de design

Les composants suivent le Branding Guide RESERVA v1.0 : couleurs (`tailwind.config.js`),
typographie Inter, boutons à coins arrondis 12px, cartes à coins arrondis 16px.
