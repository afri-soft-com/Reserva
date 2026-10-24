import 'package:flutter/material.dart';
import '../theme.dart';

class Squelette extends StatefulWidget {
  final double largeur;
  final double hauteur;
  final double rayon;

  const Squelette({super.key, this.largeur = double.infinity, this.hauteur = 16, this.rayon = 8});

  @override
  State<Squelette> createState() => _SqueletteState();
}

class _SqueletteState extends State<Squelette> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 0.45, end: 1).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut)),
      child: Container(
        width: widget.largeur,
        height: widget.hauteur,
        decoration: BoxDecoration(
          color: AppCouleurs.texteSecondaire.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(widget.rayon),
        ),
      ),
    );
  }
}

class CarteSquelette extends StatelessWidget {
  const CarteSquelette({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(bottom: 12),
      child: Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Squelette(largeur: 120, hauteur: 14),
              SizedBox(height: 10),
              Squelette(hauteur: 18),
              SizedBox(height: 8),
              Squelette(largeur: 180, hauteur: 14),
              SizedBox(height: 10),
              Squelette(hauteur: 14),
            ],
          ),
        ),
      ),
    );
  }
}

class EcranVide extends StatelessWidget {
  final IconData icone;
  final String message;
  final String? sousTitre;
  final Widget? action;

  const EcranVide({super.key, required this.icone, required this.message, this.sousTitre, this.action});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icone, size: 56, color: AppCouleurs.texteSecondaire.withValues(alpha: 0.4)),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppCouleurs.texteSecondaire)),
            if (sousTitre != null) ...[
              const SizedBox(height: 8),
              Text(sousTitre!, textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire.withValues(alpha: 0.7))),
            ],
            if (action != null) ...[
              const SizedBox(height: 20),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

/// État d'erreur distinct d'un écran vide (avec retry).
class EcranErreur extends StatelessWidget {
  final String message;
  final String? sousTitre;
  final VoidCallback? onRetry;

  const EcranErreur({
    super.key,
    this.message = 'Impossible de charger',
    this.sousTitre = 'Vérifiez votre connexion puis réessayez.',
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return EcranVide(
      icone: Icons.cloud_off_outlined,
      message: message,
      sousTitre: sousTitre,
      action: onRetry == null
          ? null
          : OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Réessayer'),
            ),
    );
  }
}
