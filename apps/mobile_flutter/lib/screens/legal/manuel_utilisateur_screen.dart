import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../app_flavor.dart';

class ManuelUtilisateurScreen extends StatelessWidget {
  const ManuelUtilisateurScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final pro = AppFlavorConfig.estPrestataire;
    final sections = pro ? _sectionsPrestataire : _sectionsClient;

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
                      ? 'Ce guide vous aide à gérer votre activité (agenda, QR, soldes).'
                      : 'Ce guide vous aide à réserver hôtels, bus et services en quelques étapes.',
                  style: const TextStyle(color: AppCouleurs.texteSecondaire, height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ...sections.map((s) => _carte(s.$1, s.$2, s.$3)),
          const SizedBox(height: 12),
          _carte(Icons.pin, 'Connexion par PIN',
              'Après l\'inscription (1 SMS), vous vous connectez uniquement avec votre PIN à 4 chiffres. '
              'Plus économique et plus rapide au quotidien.'),
        ],
      ),
    );
  }

  static const _sectionsClient = <(IconData, String, String)>[
    (Icons.search, 'Rechercher', 'Utilisez Accueil ou Voyages pour trouver un hôtel, un bus ou un service santé/restauration.'),
    (Icons.hotel, 'Réserver un hôtel', 'Choisissez les dates → type de chambre → hold 15 min → payez (Mobile Money ou espèces).'),
    (Icons.directions_bus, 'Réserver un bus', 'Origine / destination / date → places → paiement → billet avec QR code.'),
    (Icons.account_balance_wallet_outlined, 'Portefeuille & fidélité', 'Suivez vos points, cartes cadeaux et historique de paiements depuis le profil.'),
    (Icons.favorite_border, 'Favoris & alertes', 'Enregistrez vos prestataires préférés et activez des alertes de disponibilité.'),
    (Icons.support_agent, 'Besoin d\'aide ?', 'Consultez vos réservations, le chat avec le prestataire, ou contactez le support RESERVA.'),
  ];

  static const _sectionsPrestataire = <(IconData, String, String)>[
    (Icons.dashboard_outlined, 'Tableau de bord', 'L\'onglet Prestataire résume vos réservations du jour, statistiques et actions rapides.'),
    (Icons.calendar_month, 'Calendrier', 'Visualisez et gérez les créneaux, indisponibilités et politiques d\'annulation.'),
    (Icons.qr_code_scanner, 'Scan QR', 'Validez la présence client en scannant le QR de la réservation ou du billet.'),
    (Icons.payments_outlined, 'Soldes & versements', 'Suivez votre net à recevoir ; les versements sont traités par l\'admin plateforme.'),
    (Icons.reviews_outlined, 'Avis', 'Répondez aux retours clients pour améliorer votre note et votre ranking.'),
    (Icons.storefront_outlined, 'Bonnes pratiques', 'Mettez à jour vos disponibilités, tarifs et photos — comme sur Booking / Trip.'),
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
                    Text(corps, style: const TextStyle(fontSize: 13.5, height: 1.4, color: AppCouleurs.texteSecondaire)),
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
