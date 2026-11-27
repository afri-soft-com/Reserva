import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../theme.dart';
import '../../app_flavor.dart';

/// Guide utilisateur intégré (Profil → Aide). Un guide par app : Client ou Pro.
/// À tenir à jour à chaque nouvelle fonction visible par l'utilisateur.
class ManuelUtilisateurScreen extends StatelessWidget {
  const ManuelUtilisateurScreen({super.key});

  static const urlSupport = 'https://reserva-web-b9au.onrender.com/support';

  @override
  Widget build(BuildContext context) {
    final pro = AppFlavorConfig.estPrestataire;
    final groupes = pro ? _guidePrestataire : _guideClient;

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: Text(pro ? 'Guide Prestataire' : 'Guide Client')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppCouleurs.primaireClair,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  pro ? 'Bienvenue sur RESERVA Pro' : 'Bienvenue sur RESERVA',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppCouleurs.primaireFonce),
                ),
                const SizedBox(height: 6),
                Text(
                  pro
                      ? 'Ce guide vous aide à ouvrir votre espace, gérer vos services, vos réservations et vos versements.'
                      : 'Ce guide vous aide à trouver et réserver un service, un hôtel ou un bus en quelques étapes.',
                  style: TextStyle(color: AppCouleurs.texteSecondaire, height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          for (final groupe in groupes) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 16, 4, 10),
              child: Text(
                groupe.titre,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppCouleurs.primaireFonce),
              ),
            ),
            ...groupe.rubriques.map((r) => _carte(r.$1, r.$2, r.$3)),
          ],
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => launchUrl(Uri.parse(urlSupport), mode: LaunchMode.externalApplication),
            icon: const Icon(Icons.support_agent),
            label: const Text('Aide en ligne et contact du support'),
          ),
        ],
      ),
    );
  }

  static const _guideClient = <_Groupe>[
    _Groupe('Commencer', [
      (Icons.explore_outlined, 'Découvrir sans compte',
          'Sur l\'écran d\'accueil, touchez « Découvrir sans compte » : vous pouvez parcourir les services, '
              'les hôtels et les trajets de bus sans vous inscrire. Un compte n\'est demandé qu\'au moment de '
              'réserver, de payer ou d\'enregistrer un favori.'),
      (Icons.person_add_alt, 'Créer un compte',
          'Inscrivez-vous avec votre numéro de téléphone (un code par SMS, puis vous choisissez un PIN à 4 chiffres), '
              'ou avec votre compte Google ou Apple.'),
      (Icons.pin, 'Se connecter avec le PIN',
          'Ensuite, connectez-vous avec votre PIN, sans nouveau SMS. Vous pouvez aussi activer l\'empreinte '
              'ou Face ID dans le profil.'),
    ]),
    _Groupe('Trouver et réserver', [
      (Icons.search, 'Rechercher',
          'Depuis l\'Accueil ou l\'onglet Rechercher : santé, restauration, administration, éducation, salles de réunion, '
              'hôtels et bus. Filtrez par catégorie et par ville, triez par note, prix ou disponibilité, ou affichez la carte.'),
      (Icons.event_available, 'Réserver un service',
          'Ouvrez le service, choisissez un créneau libre puis confirmez. Vous pouvez régler un acompte par '
              'Mobile Money pour garantir votre place.'),
      (Icons.hotel, 'Réserver un hôtel',
          'Ville et dates → type de chambre et tarif → la chambre vous est gardée 15 minutes → paiement par '
              'Mobile Money ou, si l\'hôtel l\'accepte, en espèces sur place.'),
      (Icons.directions_bus, 'Réserver un bus',
          'Départ, arrivée et date → horaire et nombre de places → paiement → billet avec QR code.'),
      (Icons.inventory_2_outlined, 'Packages',
          'Certains établissements proposent des forfaits qui regroupent plusieurs services à un prix préférentiel.'),
      (Icons.hourglass_empty, 'Complet ? Liste d\'attente',
          'Si un créneau est complet, inscrivez-vous sur la liste d\'attente ou créez une alerte : vous serez prévenu '
              'dès qu\'une place se libère.'),
    ]),
    _Groupe('Après la réservation', [
      (Icons.qr_code_2, 'Mes réservations',
          'L\'onglet Réservations affiche vos réservations, leur statut et le QR code à présenter sur place. '
              'Vous pouvez modifier ou annuler selon les conditions indiquées sur la réservation.'),
      (Icons.chat_bubble_outline, 'Messages et avis',
          'Échangez avec l\'établissement depuis la réservation, puis laissez un avis après votre visite.'),
      (Icons.account_balance_wallet_outlined, 'Portefeuille et fidélité',
          'Suivez vos points, vos cartes cadeaux et l\'historique de vos paiements depuis le profil.'),
      (Icons.favorite_border, 'Favoris',
          'Enregistrez vos établissements préférés pour les retrouver rapidement.'),
    ]),
    _Groupe('Votre compte', [
      (Icons.notifications_none, 'Notifications',
          'Confirmations, rappels et messages arrivent dans les notifications de l\'app.'),
      (Icons.delete_outline, 'Supprimer mon compte',
          'Profil → Supprimer mon compte. La suppression est définitive.'),
      (Icons.support_agent, 'Besoin d\'aide ?',
          'Écrivez à support@reserva.cd ou ouvrez l\'aide en ligne ci-dessous.'),
    ]),
  ];

  static const _guidePrestataire = <_Groupe>[
    _Groupe('Ouvrir votre espace', [
      (Icons.person_add_alt, 'Inscription',
          'Inscrivez-vous avec votre numéro de téléphone (code par SMS, puis PIN à 4 chiffres) ou avec Google ou Apple, '
              'puis renseignez votre établissement : nom, catégorie, ville et adresse.'),
      (Icons.folder_shared_outlined, 'Validation par RESERVA',
          'L\'équipe RESERVA vérifie votre dossier. Des documents (pièce d\'identité, RCCM…) peuvent vous être demandés '
              'depuis « Préparer mon dossier KYC ».'),
      (Icons.lock_open, 'Code d\'activation',
          'Une fois le dossier approuvé, vous recevez un code à 6 chiffres par SMS (et par e-mail si votre compte en a un). '
              'Saisissez-le pour ouvrir votre espace. Pas reçu ? Touchez « Renvoyer par SMS » ou « Recevoir par e-mail ».'),
    ]),
    _Groupe('Au quotidien', [
      (Icons.dashboard_outlined, 'Tableau de bord',
          'Votre espace résume les réservations du jour, celles en attente et vos statistiques.'),
      (Icons.fact_check_outlined, 'Réservations',
          'L\'onglet Réservations liste les demandes : confirmez-les ou refusez-les, et suivez celles à venir.'),
      (Icons.calendar_month, 'Calendrier',
          'Visualisez vos créneaux, ajoutez vos indisponibilités et réglez vos conditions d\'annulation.'),
      (Icons.qr_code_scanner, 'Scan QR',
          'À l\'arrivée du client, scannez le QR code de sa réservation ou de son billet pour valider sa présence.'),
      (Icons.reviews_outlined, 'Avis',
          'Répondez aux avis de vos clients : cela améliore votre note et votre visibilité.'),
    ]),
    _Groupe('Votre offre', [
      (Icons.design_services_outlined, 'Services et tarifs',
          'Onglet Services : créez vos prestations avec leur durée, leur prix et leurs créneaux.'),
      (Icons.inventory_2_outlined, 'Packages',
          'Regroupez plusieurs services dans un forfait à prix préférentiel.'),
    ]),
    _Groupe('Votre argent', [
      (Icons.payments_outlined, 'Solde et versements',
          'Les paiements des clients sont conservés 48 h après la prestation (protection en cas de litige), puis passent '
              'dans votre solde disponible. Dans Finances, touchez « Demander un versement » pour recevoir le montant '
              'sur votre numéro Mobile Money.'),
      (Icons.support_agent, 'Besoin d\'aide ?',
          'Écrivez à support@reserva.cd ou ouvrez l\'aide en ligne ci-dessous.'),
    ]),
  ];

  Widget _carte(IconData icon, String titre, String corps) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppCouleurs.blanc,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppCouleurs.primaireClair,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppCouleurs.primaire, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(titre, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text(corps, style: TextStyle(fontSize: 13.5, height: 1.4, color: AppCouleurs.texteSecondaire)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Groupe {
  final String titre;
  final List<(IconData, String, String)> rubriques;
  const _Groupe(this.titre, this.rubriques);
}
