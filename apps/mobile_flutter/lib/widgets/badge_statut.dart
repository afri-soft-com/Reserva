import 'package:flutter/material.dart';
import '../theme.dart';

class BadgeStatut extends StatelessWidget {
  final String statut;

  const BadgeStatut({super.key, required this.statut});

  @override
  Widget build(BuildContext context) {
    final palette = StatutStyles.reservation[statut];
    if (palette == null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(AppRayons.pilule),
        ),
        child: Text(statut, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey)),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: palette.fond,
        borderRadius: BorderRadius.circular(AppRayons.pilule),
      ),
      child: Text(
        statutLibelle(statut),
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: palette.texte),
      ),
    );
  }

  static String statutLibelle(String s) {
    switch (s) {
      case 'EN_ATTENTE': return 'En attente';
      case 'CONFIRMEE': return 'Confirmée';
      case 'EN_COURS': return 'En cours';
      case 'REFUSEE': return 'Refusée';
      case 'ANNULEE': return 'Annulée';
      case 'TERMINEE': return 'Terminée';
      case 'ABSENCE': return 'Absence';
      default: return s;
    }
  }
}
