# Commandes RESERVA

**Modèle :** marketplace mono-opérateur (pas multi-tenant SaaS). Isolation vendeur = `prestataireId`, admin = plateforme globale.

## Plateforme (recommandé)
```bash
npm run build:shared
npm run dev:platform   # core:4101 hotels:4102 booking:4103 transport:4104 gateway:4000 web:3001
```

## Web admin (Next.js :3001)
```bash
npm run dev:web
# NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## API / microservices
```bash
npm run dev:core       # :4101 (auth, admin, économie, santé)
npm run dev:hotels     # :4102
npm run dev:booking    # :4103
npm run dev:transport  # :4104
npm run dev:gateway    # :4000 — URL utilisée par web + mobile
```

## Bases SQLite
```bash
npm run db:generate && npm run db:seed
npm run db:push:hotels && npm run db:seed:hotels
npm run db:push:booking
npm run db:push:transport && npm run db:seed:transport
```

## Mobile Flutter
```bash
npm run pub:mobile
npm run analyze:mobile
npm run dev:mobile
# Appareil physique :
cd apps/mobile_flutter && flutter run --dart-define=API_URL=http://192.168.x.x:4000/api
```

## Tests / smoke
```bash
npm run smoke:local
npm run test:e2e -w apps/web   # gateway + web déjà up
```

Admin démo : `+243900000001` / PIN `1234`.
