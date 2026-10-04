# Tests E2E — Console admin RESERVA

## Specs

- `connexion.spec.ts` — formulaire admin, refus client, login admin → pilotage
- `admin.spec.ts` — redirection non connecté, pilotage admin, refus client

## Prérequis

- Gateway + plateforme : `npm run dev:platform`
- Web : http://localhost:3001
- Base seedée

```bash
npm run test:e2e -w apps/web
```

Compte admin : `+243900000001` / PIN `1234`.
