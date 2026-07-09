# RESERVA — Branding Guide & Product Requirements Document (PRD)

**Application de Réservation Planifiée — RDCongo**
Version 1.0 — Juin 2026

---

# PARTIE I — GUIDE DE MARQUE (BRANDING)

## 1. Identité de la Marque

### 1.1 Nom & Slogan

Le nom **RESERVA** est un mot fort, mémorisable et multilingue. Il évoque directement la réservation en français et en espagnol, deux langues familières dans l'espace francophone d'Afrique centrale. Sa prononciation est universelle, accessible aux locuteurs de lingala et de swahili.

| Élément | Valeur |
|---|---|
| Nom de l'application | RESERVA |
| Slogan principal | « Réservez. Sereinement. » |
| Slogan alternatif | « Votre temps est précieux » |
| Tagline anglaise | « Book it. Own it. » |
| Positionnement | Fiabilité, simplicité, confiance — adapté à la réalité congolaise |

### 1.2 Valeurs de la Marque

- **Fiabilité** : chaque réservation est confirmée, chaque promesse tenue
- **Accessibilité** : une interface pensée pour tous, même les moins aguerris
- **Localisé** : ancré dans la réalité congolaise, les opérateurs, les langues
- **Transparence** : prix clairs, politiques lisibles, aucune surprise
- **Innovation responsable** : technologie au service du quotidien africain

### 1.3 Personnalité de la Marque

RESERVA est une marque jeune, professionnelle et chaleureuse. Elle parle à tous les Congolais — étudiant, chef d'entreprise, infirmier, touriste. Son ton est direct, positif, et jamais condescendant. Elle inspire confiance tout en restant accessible.

---

## 2. Identité Visuelle

### 2.1 Palette de Couleurs

La palette RESERVA s'inspire des couleurs du drapeau congolais (bleu, rouge, jaune) réinterprétées dans un registre moderne et digital.

| Couleur | Code | Usage |
|---|---|---|
| Bleu Primaire | `#1A56DB` | Couleur principale. Confiance, professionnalisme. UI principale, boutons CTA, headers. |
| Bleu Nuit | `#0F2A5E` | Couleur de profondeur. Titres, textes importants, fonds sombres. |
| Or Congo | `#F5A623` | Couleur d'accent inspirée du drapeau. Alertes, badges, mise en valeur. |
| Vert Confirmation | `#10B981` | Statut positif. Confirmations, succès, disponibilité. |
| Rouge Urgent | `#DC2626` | Alertes, annulations, erreurs, délais dépassés. |
| Gris Texte | `#6B7280` | Corps de texte secondaire, placeholders, labels. |
| Blanc Fond | `#F9FAFB` | Arrière-plan des cartes, fond d'écran principal. |

### 2.2 Typographie

| Usage | Police | Grammage / Taille |
|---|---|---|
| Logotype / Titres | Inter ExtraBold | 900 — 32px à 64px |
| Sous-titres | Inter SemiBold | 600 — 18px à 24px |
| Corps de texte | Inter Regular | 400 — 14px à 16px |
| Labels / Caps | Inter Medium | 500 — 11px à 12px, lettres en capitales |
| Code / Numéros | JetBrains Mono | 400 — Numéros de réservation, codes OTP |

### 2.3 Logo & Iconographie

Le logo RESERVA se compose de deux éléments :

- **Le symbole R stylisé** : lettre R avec une encoche en forme de calendrier ou d'horloge dans la jambe, évoquant la réservation temporelle
- **Le logotype** : RESERVA en Inter ExtraBold, en bleu primaire ou blanc selon le fond

**Déclinaisons du logo :**

- Horizontal (texte + icône) : usage principal, headers, documents
- Vertical (icône au-dessus du texte) : réseaux sociaux, splash screen
- Icône seule : app icon, favicon, notifications
- Monochrome blanc : sur fonds colorés sombres
- Monochrome noir : documents imprimés, partenariats formels

### 2.4 Composants UI — Design System

| Composant | Spécification |
|---|---|
| Bouton primaire | Fond #1A56DB, texte blanc, border-radius 12px, hauteur 48px, font Inter SemiBold |
| Bouton secondaire | Fond transparent, bordure #1A56DB, texte #1A56DB, mêmes dimensions |
| Bouton destructif | Fond #DC2626, texte blanc — annulations, suppressions |
| Cards | Fond blanc, ombre légère (0 2px 8px rgba(0,0,0,0.08)), radius 16px, padding 16px |
| Champs de saisie | Fond #F9FAFB, bordure #D1D5DB, focus border #1A56DB, radius 10px, hauteur 52px |
| Badge statut | Confirmé : vert ; En attente : orange ; Annulé : rouge ; radius full |
| Bottom Navigation | 5 icônes max, couleur active #1A56DB, inactif #6B7280 |
| Notifications | Toast en bas d'écran, 3 secondes, icône + message court |

### 2.5 Ton Éditorial & Voice & Tone

La voix de RESERVA est celle d'un ami professionnel et fiable. Elle est :

- **Claire** : courtes phrases, vocabulaire simple, pas de jargon technique
- **Positive** : messages d'encouragement, confirmations enthousiastes
- **Respectueuse** : vouvoiement systématique dans l'interface
- **Locale** : références aux villes congolaises, aux opérateurs locaux

| À éviter | Recommandé |
|---|---|
| Erreur : votre paiement a échoué ! | Oops ! Le paiement n'est pas passé. Réessayez ? |
| Transaction non complétée. | Votre réservation est confirmée ! 🎉 |
| Cliquez ici | Appuyez sur « Confirmer » |
| Authentification requise | Connectez-vous pour continuer |
| Le service est indisponible | Ce créneau vient d'être pris. Voici les suivants : |

---

# PARTIE II — PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 3. Vision Produit

### 3.1 Énoncé de Vision

> RESERVA est la première plateforme de réservation planifiée de la RDCongo, permettant à chaque Congolais de gérer son temps et ses services avec sérénité, quel que soit son niveau numérique ou sa connexion internet.

### 3.2 Problème à Résoudre

- 70% des rendez-vous médicaux en RDC se font sans réservation préalable, générant des attentes de 2 à 5 heures
- Les compagnies de transport vendent leurs billets uniquement aux guichets physiques, obligeant des déplacements préalables
- Les hôteliers n'ont pas d'outil numérique de gestion des réservations accessible
- Absence d'un outil unifié pour gérer les rendez-vous et les créneaux de service

### 3.3 Opportunité de Marché

| Indicateur | Valeur |
|---|---|
| Population RDC | 100M+ habitants |
| Taux de pénétration mobile | 43% |
| Marché Mobile Money RDC | $2.3B |
| Cible initiale (Kinshasa) | 15M+ utilisateurs potentiels |
| Concurrent direct identifié | 0 |
| Horizon de rentabilité visé | 3 ans |

---

## 4. Spécifications Produit

### 4.1 Architecture Technique

- **Frontend mobile** : React Native (Android prioritaire, iOS secondaire)
- **Frontend web** : Next.js — responsive, PWA pour usage hors ligne
- **Backend** : Node.js + Express.js ou NestJS — API RESTful
- **Base de données** : PostgreSQL (données relationnelles) + Redis (cache, sessions)
- **Stockage fichiers** : AWS S3 ou équivalent (photos, documents, reçus PDF)
- **Paiements** : Intégration SDK M-Pesa DRC (Vodacom), Airtel Money, Orange Money
- **SMS / Notifications** : Africa's Talking API ou équivalent (opérateurs locaux)
- **Hébergement** : serveurs AWS af-south-1 (Afrique du Sud) pour latence optimale
- **CDN** : CloudFront avec edge locations Afrique

### 4.2 Fonctionnalités Produit — Backlog Priorisé

| Fonctionnalité | Description | Priorité | Phase |
|---|---|---|---|
| Inscription SMS/OTP | Inscription via numéro de téléphone congolais, validation OTP | Must Have | MVP |
| Profil utilisateur | Photo, nom, historique réservations, portefeuille RESERVA | Must Have | MVP |
| Recherche services | Par catégorie, ville, quartier, disponibilité | Must Have | MVP |
| Réservation temps réel | Sélection créneau, confirmation instantanée ou manuelle | Must Have | MVP |
| Paiement Mobile Money | M-Pesa, Airtel Money, Orange Money intégrés nativement | Must Have | MVP |
| Rappels SMS/Push | Rappels automatiques à 24h et 1h avant | Must Have | MVP |
| Dashboard prestataire | Gestion créneaux, réservations du jour, statistiques | Must Have | MVP |
| Mode hors ligne | Consultation réservations sans connexion, sync auto | Must Have | MVP |
| Annulation & Remboursement | Politique configurable, remboursement Mobile Money | Must Have | MVP |
| Avis & Notations | Notation 5 étoiles après chaque réservation complétée | Should Have | P2 |
| Carte interactive | OpenStreetMap intégré, recherche géographique | Should Have | P2 |
| Lingala / Swahili | Interface multilingue complète | Should Have | P2 |
| Rapports PDF | Export réservations, factures, rapports prestataires | Should Have | P2 |
| IA Recommandation | Suggestions basées sur l'historique et la localisation | Could Have | P3 |
| API Partenaires | Intégration avec systèmes tiers (hôpitaux, agences) | Could Have | P3 |
| Programme fidélité | Points RESERVA, réductions, statuts VIP | Could Have | P3 |

---

## 5. Métriques & KPIs

### 5.1 Métriques de Succès MVP (6 premiers mois)

| KPI | Objectif M3 | Objectif M6 | Criticité |
|---|---|---|---|
| Utilisateurs inscrits | 5 000 | 25 000 | Critique |
| Prestataires actifs | 50 | 200 | Critique |
| Réservations / mois | 2 000 | 15 000 | Critique |
| Taux de confirmation | > 85% | > 90% | Critique |
| Taux de no-show | < 20% | < 10% | Élevé |
| NPS (satisfaction) | > 40 | > 55 | Élevé |
| DAU / MAU ratio | > 15% | > 25% | Élevé |
| Délai de remboursement | < 48h | < 24h | Élevé |
| Note app store | > 4.0 | > 4.3 | Moyen |
| Taux de rétention M1 | > 40% | > 55% | Critique |

### 5.2 Modèle de Revenus

- **Commission sur réservation** : 3–5% du montant de chaque transaction réalisée via RESERVA
- **Abonnement prestataire Premium** : $15–30 USD/mois (fonctionnalités avancées, mise en avant)
- **Publicité locale** : mise en avant de prestataires dans les résultats de recherche
- **Frais de service** : frais fixes sur les réservations > $50 USD
- **API B2B** : licences pour hôpitaux, hôtels, compagnies de bus (intégration système)

---

## 6. Roadmap Produit

| Période | Phase | Objectifs clés | Villes cibles |
|---|---|---|---|
| M1–M4 | MVP — Santé & Transport | Inscription, réservation médicale, billets bus, paiement Mobile Money | Kinshasa |
| M5–M7 | Expansion — Hôtellerie | Ajout hôtels, notation utilisateurs, carte interactive, lingala | Kinshasa, Lubumbashi |
| M8–M10 | Croissance | Restauration, salles, IA recommandation, API partenaires | Goma, Mbuji-Mayi |
| M11–M15 | Consolidation | Services admin, éducation, fidélité, export données | Kisangani, Bukavu |
| M16+ | Scale & International | Expansion régionale (Congo-Brazzaville, Gabon), app iOS | Afrique Centrale |

### 6.1 Risques & Mitigation

| Risque | Impact | Mitigation |
|---|---|---|
| Faible adoption prestataires | Élevé | Onboarding terrain assisté, offre gratuite 6 mois, formation |
| Instabilité réseau mobile | Élevé | Mode hors ligne robuste, synchronisation intelligente |
| Fraude paiement Mobile Money | Élevé | Double vérification, alertes fraude, partenariat opérateurs |
| Réglementation données personnelles | Moyen | DPO nommé, conformité loi congolaise, stockage local |
| Concurrence régionale (startups) | Moyen | Différenciation locale, ancrage terrain, réseau prestataires |
| Coupures d'électricité fréquentes | Faible | App légère, cache agressif, expérience dégradée fonctionnelle |

---

## 7. Équipe & Organisation

### 7.1 Équipe Produit Recommandée

- 1 Product Manager (Chef de produit) — vision, priorisation, liaison business/tech
- 1 UX/UI Designer — expérience utilisateur, design system, tests usabilité
- 2 Développeurs mobile (React Native) — Android prioritaire
- 2 Développeurs backend (Node.js/PostgreSQL)
- 1 Développeur web front-end (Next.js)
- 1 Ingénieur DevOps / Cloud (AWS, CI/CD)
- 1 QA Engineer — tests automatisés et manuels
- 1 Business Developer — acquisition prestataires terrain, partenariats opérateurs
- 1 Customer Success Manager — support utilisateurs, feedback

### 7.2 Méthodologie

- Agile / Scrum — sprints de 2 semaines
- Revues de sprint bihebdomadaires avec parties prenantes
- Tests utilisateurs terrain à Kinshasa dès la semaine 8
- Bêta privée avec 100 utilisateurs et 10 prestataires avant le lancement public

---

*RESERVA — Réservez. Sereinement. | Document confidentiel v1.0 — Juin 2026*
