# Innovations RESERVA (différenciation)

## Fonctionnalités

| Feature | API | Où tester |
|---------|-----|-----------|
| Score confiance | champs `Prestataire.scoreConfiance` + `POST /innovations/confiance/recalculer` | Fiche service mobile · Admin litiges |
| Kit famille | `/innovations/beneficiaires` + `beneficiaires` sur `POST /reservations` | Profil → Kit famille |
| Garantie arrivée | `POST /innovations/garantie/reclamer` | Détail réservation (payée) |
| Corridors | packages `estCorridor=true` · `GET /packages?corridors=1` | Profil → Corridors |
| Agent quartier | rôle `AGENT` · `POST /innovations/agents/activer` · `GET /innovations/agents/moi` | Compte `+243960000001` / PIN `1234` |
| Médiation | `/innovations/litiges` | App client + Admin → Litiges |
| File terrain Pro | `/innovations/terrain/file` + `appeler-prochain` | App Pro → menu → File terrain |
| Acompte échelonné | `Reservation.acomptePourcent` + paiement `acompteUniquement` | Écran paiement |
| Canal SMS/USSD | `POST /innovations/canal-sms` `{ telephone, texte }` | Commandes : `AIDE`, `SOLDE`, `MES RDV`, `GARANTIE <numero>` |
| Recherche vocale | UI micro (clavier vocal) | Écran recherche services |

## Comptes mock

- Agent : `+243960000001` / `1234` (app Client)
- Admin litiges : [http://localhost:3001/admin/litiges](http://localhost:3001/admin/litiges)

## Config admin (Tarifications)

Clés ajoutées / éditables : `POINTS_PARRAINAGE`, `VALEUR_POINT_CDF`, `POINTS_TRANCHE_CDF`, `COMMISSION_AGENT`, `PUB_CPM_CDF`, `PUB_CPC_CDF`, `PUB_FORFAIT_CDF` (+ commission / frais clients déjà présents).

- Agents : `/admin/agents`
- Pubs facturables : `/admin/publicites` (modèle GRATUIT / FORFAIT / CPM / CPC)
