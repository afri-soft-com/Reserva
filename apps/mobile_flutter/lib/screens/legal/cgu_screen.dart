import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../app_flavor.dart';

class CguScreen extends StatelessWidget {
  const CguScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final pro = AppFlavorConfig.estPrestataire;
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Conditions générales')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            pro ? 'CGU — RESERVA Pro (Prestataires)' : 'CGU — RESERVA (Clients)',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppCouleurs.primaireFonce),
          ),
          const SizedBox(height: 8),
          Text('Dernière mise à jour : octobre 2026', style: TextStyle(color: AppCouleurs.texteSecondaire, fontSize: 13)),
          const SizedBox(height: 20),
          _section('1. Objet',
              'RESERVA est une plateforme de réservation marketplace opérée en République Démocratique du Congo. '
              'Elle met en relation des clients et des prestataires (hôtels, transport, santé, etc.).'),
          _section('2. Compte utilisateur',
              'L\'inscription nécessite un numéro de téléphone congolais valide. '
              'Un SMS de vérification est envoyé une seule fois à l\'inscription. '
              'Les connexions ultérieures se font exclusivement via un code PIN à 4 chiffres, afin de limiter les coûts SMS.'),
          if (pro)
            _section('3. Obligations du prestataire',
                'Le prestataire s\'engage à fournir des informations exactes (disponibilités, tarifs, politiques d\'annulation), '
                'à honorer les réservations confirmées, et à respecter les délais de traitement. '
                'RESERVA peut suspendre un compte en cas de fraude, no-show répétés ou non-respect des CGU.')
          else
            _section('3. Obligations du client',
                'Le client s\'engage à fournir des informations exactes, à respecter les conditions d\'annulation '
                'affichées lors de la réservation, et à régler les montants dus (Mobile Money ou espèces selon l\'offre).'),
          _section('4. Paiements & commissions',
              pro
                  ? 'Les paiements transitent selon les modalités définies par RESERVA. Une commission et des frais de service '
                      'peuvent être prélevés. Les versements prestataire sont soumis à un seuil minimum et à validation admin.'
                  : 'Les prix affichés incluent le cas échéant les frais de service. Les paiements Mobile Money sont confirmés '
                      'par l\'opérateur. En mode simulation locale, aucun débit réel n\'est effectué.'),
          _section('5. Données personnelles',
              'Les données (téléphone, nom, historique de réservations) sont traitées pour le fonctionnement du service. '
              'Vous pouvez demander la correction de vos informations depuis le profil.'),
          _section('6. Responsabilité',
              'RESERVA agit en qualité d\'intermédiaire. La responsabilité de la prestation incombe au prestataire. '
              'RESERVA s\'efforce d\'assurer la disponibilité de la plateforme sans garantie d\'absence d\'interruption.'),
          _section('7. Acceptation',
              'En cochant « J\'accepte les CGU » lors de l\'inscription, vous reconnaissez avoir lu et accepté les présentes conditions.'),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _section(String titre, String corps) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(titre, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppCouleurs.texte)),
          const SizedBox(height: 6),
          Text(corps, style: const TextStyle(fontSize: 14, height: 1.45, color: AppCouleurs.texteSecondaire)),
        ],
      ),
    );
  }
}
