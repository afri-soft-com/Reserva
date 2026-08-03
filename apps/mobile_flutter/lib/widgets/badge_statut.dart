import 'package:flutter/material.dart';
import '../theme.dart';
import '../i18n.dart';

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
        child: Text(AppTraductions.statut(statut), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey)),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: palette.fond,
        borderRadius: BorderRadius.circular(AppRayons.pilule),
      ),
      child: Text(
        AppTraductions.statut(statut),
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: palette.texte),
      ),
    );
  }

  static String statutLibelle(String s) => AppTraductions.statut(s);
}
