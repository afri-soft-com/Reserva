# RESERVA — Cahier des Charges Fonctionnel & User Stories

**Application de Réservation Planifiée — République Démocratique du Congo**
Version 1.0 — Juin 2026

---

## 1. Présentation du Projet

### 1.1 Contexte

En République Démocratique du Congo, la gestion des réservations de services reste majoritairement manuelle et informelle. Les citoyens de Kinshasa, Lubumbashi, Goma et des autres grandes villes font face à des problèmes récurrents : longues files d'attente, déplacements inutiles, manque d'informations sur les disponibilités, et impossibilité de planifier à l'avance.

RESERVA est une application mobile et web de réservation planifiée qui vise à digitaliser et structurer l'accès aux services dans plusieurs secteurs clés de la RDCongo, en tenant compte des réalités locales : connectivité intermittente, paiement mobile (M-Pesa, Airtel Money, Orange Money), et multilinguisme (français, lingala, swahili).

### 1.2 Objectifs

- Permettre aux utilisateurs de réserver tout service à l'avance via smartphone ou web
- Réduire les files d'attente et les déplacements inutiles
- Offrir aux prestataires de services un outil de gestion des créneaux
- Intégrer les modes de paiement mobile locaux (M-Pesa, Airtel Money, Orange Money)
- Fonctionner en mode hors ligne partiel pour pallier les coupures de réseau
- Respecter les réglementations congolaises sur la protection des données

### 1.3 Périmètre fonctionnel

| Catégorie | Exemples de services | Phase |
|---|---|---|
| Santé | Médecins, cliniques, labos, pharmacies | Phase 1 (MVP) |
| Transport | Bus interurbains, taxis, minibus | Phase 1 (MVP) |
| Hôtellerie | Hôtels, maisons d'hôtes, guesthouses | Phase 1 (MVP) |
| Restauration | Restaurants, traiteurs, réservations de salle | Phase 2 |
| Salles de réunion | Espaces coworking, salles de conférence | Phase 2 |
| Services administratifs | Mairies, notaires, ambassades | Phase 3 |
| Éducation | Cours particuliers, formations | Phase 3 |

---

## 2. Acteurs & Profils Utilisateurs

### 2.1 Utilisateurs finaux (Clients)

- Citoyens congolais cherchant à réserver un service à l'avance
- Tranche cible : 18–55 ans, utilisateurs smartphone Android (majoritaire en RDC)
- Niveaux de maîtrise numérique variés — interface simple et intuitive requise
- Langue : français, lingala, swahili

### 2.2 Prestataires de Services

- Médecins et établissements de santé
- Hôteliers et gestionnaires d'hébergement
- Compagnies de transport et agences de voyages
- Gérants de restaurants et salles d'événements

### 2.3 Administrateurs

- Équipe RESERVA : gestion de la plateforme, validation des prestataires, support
- Super-administrateurs : paramétrage global, statistiques, accès complet

---

## 3. Exigences Fonctionnelles

### 3.1 Module Authentification & Profil

1. Inscription via numéro de téléphone (OTP SMS) ou email
2. Connexion avec mot de passe ou code PIN à 4 chiffres
3. Profil utilisateur avec photo, nom, NIF optionnel
4. Profil prestataire avec vérification manuelle par l'équipe RESERVA
5. Récupération de compte par SMS

### 3.2 Module Recherche & Découverte

1. Recherche par catégorie, nom, ville, quartier
2. Filtres avancés : disponibilité, prix, note, distance
3. Carte interactive (OpenStreetMap, adaptée hors ligne)
4. Système de notation et avis vérifiés
5. Suggestions personnalisées basées sur l'historique

### 3.3 Module Réservation

1. Sélection de créneaux horaires disponibles en temps réel
2. Réservation instantanée ou avec confirmation du prestataire
3. Réservation pour soi ou pour un tiers
4. Ajout de notes/instructions spéciales
5. Confirmation par SMS et notification push
6. Rappels automatiques (24h et 1h avant)

### 3.4 Module Paiement

1. M-Pesa (Vodacom), Airtel Money, Orange Money
2. Paiement en espèces sur place (option)
3. Paiement partiel (acompte + solde)
4. Génération de reçu PDF téléchargeable
5. Remboursement automatique en cas d'annulation sous conditions

### 3.5 Module Gestion Prestataire

1. Tableau de bord : réservations du jour, semaine, mois
2. Gestion des créneaux et horaires d'ouverture
3. Blocage de dates (congés, jours fériés, événements)
4. Notifications d'une nouvelle réservation
5. Rapports et statistiques (revenus, taux d'occupation)

### 3.6 Module Annulation & Modification

1. Politique d'annulation configurable par prestataire
2. Modification de créneau sous conditions
3. Annulation gratuite jusqu'à N heures avant
4. Frais d'annulation tardive définis par le prestataire

---

## 4. Exigences Non Fonctionnelles

### 4.1 Performance

- Temps de chargement < 3 secondes sur réseau 3G (standard majoritaire en RDC)
- Mode hors ligne : consultation des réservations actives sans connexion
- Synchronisation automatique au retour de connectivité

### 4.2 Sécurité

- Chiffrement TLS 1.3 pour toutes les communications
- Données personnelles stockées en conformité avec les lois congolaises
- Authentification 2FA optionnelle par SMS
- Protection contre les injections SQL et attaques XSS

### 4.3 Accessibilité & Localisation

- Interface disponible en français (langue principale), lingala, swahili
- Devise : Franc Congolais (CDF) et Dollar USD
- Fuseaux horaires : UTC+1 (Kinshasa) et UTC+2 (Lubumbashi/Goma)
- Taille de police adaptable pour accessibilité visuelle

### 4.4 Compatibilité

- Android 6.0+ (priorité, > 85% du marché congolais)
- iOS 13+ (secondaire)
- Web responsive (Chrome, Firefox)
- Taille APK < 30 MB pour économiser les données mobiles

---

## 5. Contraintes & Spécificités RDCongo

| Contrainte | Solution proposée |
|---|---|
| Connectivité limitée | Mode hors ligne, compression des données, chargement progressif |
| Paiement mobile dominant | Intégration native M-Pesa, Airtel Money, Orange Money |
| Coupures d'électricité | Application légère, cache local, synchronisation différée |
| Multilinguisme | Interface en français, lingala et swahili (v1.1) |
| Adressage non standardisé | Utilisation des quartiers/communes comme référence géographique |
| Faible bancarisation | Paiement espèces maintenu comme option |
| Fiscalité locale | Génération de reçus conformes aux exigences de l'administration congolaise |

---

## 6. User Stories

Les user stories sont organisées par rôle et priorisées selon la méthode MoSCoW (Must Have / Should Have / Could Have / Won't Have pour le MVP).

### 6.1 Utilisateur Final — Inscription & Connexion

#### US-001 — User Story
**En tant que** nouvel utilisateur, **je veux** m'inscrire avec mon numéro de téléphone, **afin de** *accéder à l'application sans avoir besoin d'un email*.

**Critères d'acceptation :**
- Un OTP à 6 chiffres est envoyé par SMS en moins de 60 secondes
- L'utilisateur peut valider l'OTP et créer son profil
- Un message de confirmation est envoyé après inscription réussie
- L'inscription fonctionne avec les opérateurs Vodacom, Airtel, Orange, MTN

**Priorité :** Haute | **Effort estimé :** 3 points

---

#### US-002 — User Story
**En tant qu'**utilisateur enregistré, **je veux** me connecter avec un code PIN à 4 chiffres, **afin de** *accéder rapidement à mon compte sans retaper mon mot de passe*.

**Critères d'acceptation :**
- Le PIN est configuré à la première connexion
- 3 tentatives échouées bloquent le compte temporairement
- Une option « Mot de passe oublié » par SMS est disponible

**Priorité :** Haute | **Effort estimé :** 2 points

---

### 6.2 Utilisateur Final — Recherche & Réservation

#### US-003 — User Story
**En tant que** patient, **je veux** rechercher un médecin disponible dans mon quartier, **afin de** *obtenir une consultation sans attendre des heures à la clinique*.

**Critères d'acceptation :**
- La recherche affiche les médecins disponibles dans les 24h
- Je peux filtrer par spécialité, quartier, et tarif
- La liste affiche le prochain créneau disponible
- Je peux voir le profil complet et les avis avant de réserver

**Priorité :** Haute | **Effort estimé :** 5 points

---

#### US-004 — User Story
**En tant que** voyageur, **je veux** réserver un billet de bus interurbain à l'avance, **afin de** *être sûr d'avoir une place sans me déplacer au terminus*.

**Critères d'acceptation :**
- Je sélectionne le trajet, la date et l'heure de départ
- Le nombre de places restantes est affiché en temps réel
- Je reçois un e-billet sur WhatsApp ou par SMS
- Le siège est confirmé après paiement Mobile Money

**Priorité :** Haute | **Effort estimé :** 8 points

---

#### US-005 — User Story
**En tant que** client d'hôtel, **je veux** réserver une chambre pour plusieurs nuits, **afin de** *organiser mon hébergement à l'avance pour mes déplacements professionnels*.

**Critères d'acceptation :**
- Je sélectionne l'hôtel, le type de chambre, les dates d'arrivée/départ
- Le prix total en CDF et USD est clairement affiché
- Je peux payer un acompte de 30% via Mobile Money
- Je reçois une confirmation avec le numéro de réservation

**Priorité :** Haute | **Effort estimé :** 8 points

---

#### US-006 — User Story
**En tant qu'**utilisateur, **je veux** annuler une réservation et être remboursé, **afin de** *ne pas perdre mon argent si mes plans changent*.

**Critères d'acceptation :**
- Je peux annuler gratuitement jusqu'à 24h avant le créneau
- Le remboursement est crédité sur mon compte Mobile Money dans les 24h
- Une notification de confirmation d'annulation m'est envoyée
- Si l'annulation est tardive, les frais sont clairement indiqués

**Priorité :** Haute | **Effort estimé :** 5 points

---

#### US-007 — User Story
**En tant qu'**utilisateur, **je veux** recevoir un rappel avant mon rendez-vous, **afin de** *ne pas oublier ma réservation*.

**Critères d'acceptation :**
- Un SMS de rappel est envoyé 24h avant le rendez-vous
- Une notification push est envoyée 1h avant
- Le rappel contient : lieu, heure, numéro de réservation

**Priorité :** Moyenne | **Effort estimé :** 3 points

---

### 6.3 Prestataire de Service

#### US-008 — User Story
**En tant que** prestataire de services, **je veux** gérer mes créneaux de disponibilité, **afin de** *contrôler mon planning et éviter les surréservations*.

**Critères d'acceptation :**
- Je configure mes horaires d'ouverture hebdomadaires
- Je peux bloquer des dates (congés, événements)
- Les créneaux non disponibles apparaissent grisés pour les clients
- Je reçois une notification pour chaque nouvelle réservation

**Priorité :** Haute | **Effort estimé :** 8 points

---

#### US-009 — User Story
**En tant que** prestataire, **je veux** voir le tableau de bord de mes réservations, **afin de** *planifier ma journée et mes ressources*.

**Critères d'acceptation :**
- Le tableau de bord affiche les réservations du jour en temps réel
- Je peux voir la liste hebdomadaire et mensuelle
- Un compteur de revenus attendus est affiché
- Je peux exporter la liste en PDF

**Priorité :** Haute | **Effort estimé :** 5 points

---

#### US-010 — User Story
**En tant que** prestataire, **je veux** définir ma politique d'annulation, **afin de** *protéger mon activité contre les no-shows*.

**Critères d'acceptation :**
- Je configure la gratuité d'annulation jusqu'à N heures avant
- Je définis le pourcentage de frais d'annulation tardive
- La politique est affichée clairement sur ma fiche
- Les remboursements sont automatiquement calculés selon ma politique

**Priorité :** Moyenne | **Effort estimé :** 5 points

---

### 6.4 Administrateur Plateforme

#### US-011 — User Story
**En tant qu'**administrateur RESERVA, **je veux** valider et approuver les prestataires, **afin de** *garantir la qualité et la légitimité des services proposés*.

**Critères d'acceptation :**
- Je reçois une demande d'inscription prestataire avec documents justificatifs
- Je peux approuver, rejeter ou demander des informations complémentaires
- Le prestataire est notifié par SMS du statut de sa demande
- Un prestataire rejeté ne peut pas créer de fiches de services

**Priorité :** Haute | **Effort estimé :** 5 points

---

#### US-012 — User Story
**En tant qu'**administrateur, **je veux** accéder aux statistiques de la plateforme, **afin de** *prendre des décisions basées sur les données*.

**Critères d'acceptation :**
- Le tableau de bord affiche : nombre de réservations, taux de completion, revenus
- Je peux filtrer par période, ville, catégorie de service
- Un rapport hebdomadaire est généré automatiquement
- Les données sont exportables en Excel et PDF

**Priorité :** Moyenne | **Effort estimé :** 8 points

---

## 7. Planning & Jalons

| Phase | Durée | Livrables | Priorité |
|---|---|---|---|
| MVP (Phase 1) | 4 mois | Auth, Santé, Transport, Hôtels, Paiements Mobile | **Must Have** |
| Phase 2 | 3 mois | Restauration, Salles, Statistiques avancées | Should Have |
| Phase 3 | 3 mois | Services admin, Éducation, Multilingue (lingala/swahili) | Could Have |
| Évolutions | Continu | IA recommandation, API partenaires, expansion villes | Won't Have (MVP) |

---

## Glossaire

- **OTP** : One-Time Password — code à usage unique envoyé par SMS
- **MVP** : Minimum Viable Product — version minimale fonctionnelle
- **CDF** : Franc Congolais — monnaie officielle de la RDC
- **No-show** : absence d'un client à son rendez-vous sans annulation préalable
- **Mobile Money** : paiement via téléphone mobile (M-Pesa, Airtel Money, Orange Money)

---

*Document RESERVA RDC v1.0 — Confidentiel*
