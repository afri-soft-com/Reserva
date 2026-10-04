# RESERVA Core API

Service **core** (port **4101**) : authentification, prestataires santé/restauration, réservations, admin, économie.

En production locale, les clients passent par la **gateway :4000**.

```bash
npm run dev:core   # depuis la racine
# ou
npm run dev        # depuis apps/api
```

Base : SQLite (`DATABASE_URL=file:./dev.db`). Voir `.env.example`.
