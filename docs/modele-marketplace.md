# Modèle marketplace RESERVA

## Décision

RESERVA reste un **marketplace OTA** (comme Trip.com / Booking.com), **sans** architecture multi-tenant SaaS.

| Concept | RESERVA |
|---------|---------|
| Opérateur plateforme | Unique (équipe RESERVA) |
| Vendeurs | Prestataires (`prestataireId`) |
| Acheteurs | Clients (catalogue partagé) |
| Admin | Rôle `ADMIN` global |
| Tenants / orgs isolées | Non |

## Revenus

1. Commission sur réservations payées  
2. Frais de service client  
3. Abonnements prestataire (commission réduite / quotas)  
4. Publicités / codes promo  

Voir module économie (`apps/api/src/modules/economie`) et console admin Finances / Ledger / Versements.

## Hors scope volontaire

- White-label multi-opérateur  
- `tenantId` sur les tables  
- Middleware de scope multi-tenant  
