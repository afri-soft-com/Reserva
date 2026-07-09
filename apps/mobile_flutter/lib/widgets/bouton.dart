import 'package:flutter/material.dart';
import '../theme.dart';

class Bouton extends StatelessWidget {
  final String titre;
  final VoidCallback? onPressed;
  final String variante;
  final String taille;
  final bool chargement;
  final bool desactive;
  final IconData? icone;

  const Bouton({
    super.key,
    required this.titre,
    this.onPressed,
    this.variante = 'primaire',
    this.taille = 'md',
    this.chargement = false,
    this.desactive = false,
    this.icone,
  });

  @override
  Widget build(BuildContext context) {
    final estDesactive = desactive || chargement;
    final hauteurs = {'sm': 36.0, 'md': 48.0, 'lg': 56.0};
    final taillesTexte = {'sm': 13.0, 'md': 15.0, 'lg': 17.0};

    Color fond, texte;
    switch (variante) {
      case 'secondaire':
        fond = Colors.transparent;
        texte = AppCouleurs.primaire;
        break;
      case 'destructif':
        fond = AppCouleurs.alerte;
        texte = AppCouleurs.blanc;
        break;
      case 'fantome':
        fond = Colors.transparent;
        texte = AppCouleurs.primaireFonce;
        break;
      default:
        fond = AppCouleurs.primaire;
        texte = AppCouleurs.blanc;
    }

    return SizedBox(
      width: double.infinity,
      height: hauteurs[taille] ?? 48,
      child: ElevatedButton(
        onPressed: estDesactive ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: fond,
          foregroundColor: texte,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRayons.bouton),
            side: variante == 'secondaire' ? const BorderSide(color: AppCouleurs.primaire, width: 2) : BorderSide.none,
          ),
          elevation: 0,
        ).copyWith(
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) return fond.withValues(alpha: 0.5);
            return fond;
          }),
        ),
        child: chargement
            ? SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: texte,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icone != null) ...[
                    Icon(icone, size: 18),
                    const SizedBox(width: 8),
                  ],
                  Text(titre, style: TextStyle(fontSize: taillesTexte[taille] ?? 15, fontWeight: FontWeight.w600)),
                ],
              ),
      ),
    );
  }
}
