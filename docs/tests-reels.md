# Tests réels RESERVA — de A à Z

Objectif : valider la plateforme comme un vrai utilisateur, sur de vrais téléphones,
avec de vrais SMS, puis de vrais paiements, avant d'ouvrir au public.

On avance par paliers. On ne passe au palier suivant que si le précédent est vert.

| Palier | Où | SMS | Paiement | Risque |
|---|---|---|---|---|
| 1. Automatique | Local / CI | simulés | simulés | aucun |
| 2. Local manuel | PC + téléphone sur le Wi-Fi | simulés (code dans la console) | simulés | aucun |
| 3. Production, paiement simulé | Apps des stores (tests internes) | **réels** | simulés | faible |
| 4. Production, paiement réel | Apps des stores | réels | **réels** (petits montants) | argent réel |

Gardez un **journal de test** (tableur) : scénario, appareil, version de l'app, résultat, capture, date.
Chaque bug noté doit indiquer comment le reproduire.

---

## 0. Préparer le matériel

- **Téléphones** : au moins 1 Android et 1 iPhone, idéalement 3 (un client, un prestataire, un de rechange).
- **Cartes SIM** : 2 ou 3 numéros RDC réels (Vodacom, Airtel, Orange) pour recevoir les OTP
  et payer en Mobile Money. Un numéro = un compte : client et prestataire sur des numéros différents.
- **PC** : la console admin web (https://reserva-web-b9au.onrender.com en production).
- **Versions** : notez la version installée (Profil → À propos, ou la bannière de mise à jour).
  En ce moment : mobile **1.0.10**, web **1.0.4**.

---

## 1. Palier 1 — Tests automatiques (10 min)

Depuis la racine du dépôt :

```bash
npm ci
```

```bash
npm run ci:quality
```

Lint, tests unitaires avec couverture et builds de tous les services. Tout doit être vert.

```bash
npm run analyze:mobile:ci
```

Analyse et tests Flutter.

À chaque push sur `main`, la CI refait tout cela, puis déploie et lance un smoke test en production
(voir [cicd.md](cicd.md)). Un pipeline rouge = on ne teste pas à la main, on corrige d'abord.

---

## 2. Palier 2 — Toute la plateforme en local (1 h)

### 2.1 Démarrer

```bash
npm run setup:local
```

À faire une seule fois : bases SQLite et données de démo.

```bash
npm run dev:platform
```

Démarre core:4101, hotels:4102, booking:4103, transport:4104, gateway:4000, web:3001.

```bash
npm run smoke:local
```

Parcours automatique lecture + écriture sur la plateforme locale. Doit finir par « ✓ Smoke local OK ».

```bash
npm run test:e2e -w apps/web
```

Tests navigateur de la console admin (plateforme déjà démarrée).

### 2.2 Mobile sur un vrai téléphone

1. PC et téléphone sur le **même Wi-Fi**. Trouvez l'IP du PC (`ipconfig` → IPv4, ex. `192.168.1.20`).
2. Branchez le téléphone en USB (mode développeur activé), puis :

```bash
npm run dev:mobile:client -- --dart-define=API_URL=http://192.168.1.20:4000/api
```

```bash
npm run dev:mobile:pro -- --dart-define=API_URL=http://192.168.1.20:4000/api
```

En local `MODE_SMS=simulation` : **aucun SMS n'est envoyé**, le code OTP s'affiche dans la console
du terminal `dev:platform` (service core). `MODE_PAIEMENT=simulation` : tout paiement réussit tout de suite.

### 2.3 Comptes de démo (base seedée)

| Rôle | Téléphone | PIN |
|---|---|---|
| Admin | `+243900000001` | `1234` |
| Client | `+243991234567` | voir seed |
| Prestataire santé (KYC validé) | `+243970000001` | voir seed |
| Prestataire hôtel | `+243970000003` | voir seed |
| Prestataire en attente de validation | `+243970000008` | voir seed |

Liste complète : `apps/api/scripts/seed-comptes-test.js`.

Déroulez en local **tous les scénarios de la section 4** : c'est gratuit et sans risque.

---

## 3. Installer les vraies apps (production)

La CI envoie chaque version aux stores. Pour tester avant le public :

**Android — Google Play Console**
1. Play Console → app *RESERVA* (puis *RESERVA Pro*) → **Tests → Tests internes**.
2. Ajoutez les adresses Gmail des testeurs dans une liste, enregistrez.
3. Copiez le **lien d'inscription** et ouvrez-le sur chaque téléphone testeur → « Devenir testeur » → installer.
   Remarque : si Google bloque le track production, la CI publie sur le track *internal* (voir les logs du job Play Store).

**iOS — App Store Connect / TestFlight**
1. App Store Connect → app → **TestFlight**. La build 1.0.10 apparaît après traitement (15–60 min).
2. *Testeurs internes* : ajoutez les membres de l'équipe (pas de revue Apple).
   *Testeurs externes* : un groupe + revue bêta rapide d'Apple.
3. Sur l'iPhone : app **TestFlight** → accepter l'invitation → installer.

Vérifiez sur chaque appareil la version installée avant de commencer.

---

## 4. Scénarios de bout en bout

Faites chaque scénario sur Android **et** iOS. Cochez : ✅ OK, ❌ bug (noté au journal), ⚠️ gêne d'ergonomie.

### A. Client — inscription et connexion
1. Installer l'app client, ouvrir → écran de bienvenue.
2. S'inscrire avec un **numéro réel** → recevoir le **SMS OTP** (délai < 1 min) → saisir le code
   (sur Android, le code doit se remplir tout seul).
3. Créer le PIN à 4 chiffres. Se déconnecter, se reconnecter avec téléphone + PIN (sans SMS).
4. PIN oublié → OTP par SMS → nouveau PIN.
5. Connexion Google, et Apple sur iPhone (si activées).
6. Couper le réseau → la bannière « hors connexion » apparaît, puis disparaît au retour du réseau.

### B. Prestataire — ouverture du compte pro
1. App **RESERVA Pro** : inscription avec un **autre numéro** → OTP → PIN.
2. Remplir le profil entreprise (catégorie, ville, quartier).
3. Envoyer les documents **KYC** (photos nettes).
4. **Console admin** → Documents & KYC → valider → Prestataires → activer.
   Le prestataire reçoit le code d'activation par SMS et peut publier.
5. Créer 2 services (prix, durée, créneaux) et une indisponibilité (congé).

### C. Réservation et paiement (cœur du produit)
1. Client : rechercher le service du prestataire B (par ville / catégorie) → fiche → choisir un créneau.
2. Réserver → payer (simulé au palier 3, réel au palier 4).
3. Vérifier : notification au prestataire, réservation « en attente » côté Pro, QR code côté client.
4. Prestataire : accepter → le client est notifié, statut « confirmée ».
5. Le jour J : scanner le QR / valider la présence → « terminée ».
6. Client : laisser un avis → la note s'affiche sur la fiche.
7. Refaire avec : refus par le prestataire, annulation par le client (contrôler le remboursement / l'avoir),
   modification de date, absence du client.

### D. Chat et appels
1. Client ↔ prestataire : messages texte, photo, réception en direct, badge de non-lus.
2. Appel vocal (si activé) : sonnerie, décrocher, raccrocher, qualité du son.

### E. Hôtels et transport
1. Client : rechercher un hôtel (ville, dates) → chambre → réserver → payer.
2. Client : rechercher un trajet (origine, destination, date) → choisir les places → billet.
3. Admin : Hôtels / Transport → créer, modifier le prix, retirer → vérifier côté app client.

### F. Argent côté prestataire et plateforme
1. Pro : Finances → solde, commissions, historique.
2. Demander un versement → Admin : Versements → valider → statut mis à jour côté Pro.
3. Admin : Finances et Journal comptable → filtrer « Personnalisée » sur la période du test
   → les montants doivent correspondre aux réservations faites.

### G. Litiges et garantie
1. Client : sur une réservation payée → « Ouvrir un litige ».
2. Admin : Litiges → trancher → client et prestataire notifiés, argent dans le bon sens.

### H. Bannières de mise à jour
1. Installer l'ancienne version (ou garder un appareil non mis à jour).
2. Admin → Versions apps : `minSoft` = dernière version → l'ancienne app affiche la bannière en moins d'1 minute.
3. « Mettre à jour » ouvre la bonne fiche du store. Après mise à jour, la bannière disparaît.
4. Web : après une nouvelle version web, la bannière s'affiche et disparaît au rechargement.

### I. Robustesse et fluidité
- Réseau lent (3G, ou 4G faible) : les écrans affichent un squelette, pas d'écran blanc ni de blocage.
- Tirer vers le bas sur les listes → rafraîchissement.
- Quitter l'app pendant un paiement puis revenir → statut juste, pas de double débit.
- Rotation, mode sombre, grande taille de police système, petit écran.
- Console admin sur téléphone et sur tablette.

---

## 5. Palier 4 — Paiements réels

> Le blueprint `render.yaml` est encore en `MODE_PAIEMENT=simulation`. Vérifiez la valeur réelle
> du service **reserva-core** sur Render avant de commencer : en simulation, aucun argent ne bouge.

1. Activer le paiement réel : workflow GitHub **enable-paiement-prod** (voir
   [mobile-money-afrisoft-pay.md](mobile-money-afrisoft-pay.md)).
2. Créer un service test à **100 FC** chez un prestataire de l'équipe.
3. Payer avec chaque opérateur (M-Pesa, Airtel Money, Orange Money) :
   confirmation sur le téléphone, statut « payé » dans l'app, écriture dans le Journal comptable.
4. Tester l'échec : solde insuffisant, refus de la demande USSD, délai dépassé → statut « échoué », aucune réservation fantôme.
5. Tester l'annulation avec remboursement et un versement réel vers le prestataire.
6. Rapprocher les montants : relevé Mobile Money = Finances admin = soldes prestataires.

---

## 6. Avant d'ouvrir au public

```bash
npm run smoke:prod
```

À lancer avec `GATEWAY_URL`, `SMOKE_ADMIN_PHONE` et `SMOKE_ADMIN_PIN` définis.

Puis cochez [checklist-production.md](checklist-production.md) ligne par ligne,
supprimez ou désactivez les comptes et services de test créés en production,
et passez en revue le journal : **zéro ❌ ouvert** sur les scénarios A, B, C et F.
