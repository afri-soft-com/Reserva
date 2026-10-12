# Appels vocaux LiveKit — RESERVA

Appels 1:1 client ↔ prestataire depuis le **chat** ou le **détail de réservation**.

## Flux

1. Mobile `POST /api/voix/token` avec `conversationId` **ou** `reservationId`
2. L’API vérifie l’appartenance, mint un JWT LiveKit (TTL 1h), room `conv:{id}` ou `resa:{id}`
3. Flutter `livekit_client` se connecte à `LIVEKIT_URL` avec le token

## Variables d’environnement (API / Render)

```env
LIVEKIT_URL=wss://….livekit.cloud
LIVEKIT_API_KEY=APIxxxx
LIVEKIT_API_SECRET=…   # jamais committer — secret unique à la création
```

GitHub (optionnel pour CI smoke) / Render service `reserva-core` :

```bash
gh secret set LIVEKIT_URL -R afri-soft-com/Reserva -b "wss://…"
gh secret set LIVEKIT_API_KEY -R afri-soft-com/Reserva -b "API…"
gh secret set LIVEKIT_API_SECRET -R afri-soft-com/Reserva -b "…"
```

Si le secret a été affiché dans un chat ou un ticket, **régénérez-le** dans le dashboard LiveKit.

## Hors scope V1

- Push FCM / ringing entrant
- Appels depuis la console admin web
- Enregistrement d’appels
