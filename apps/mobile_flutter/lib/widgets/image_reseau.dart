import 'package:flutter/material.dart';
import 'squelette.dart';

/// Image distante fluide : décodée à la taille affichée (pas en pleine
/// résolution, ce qui saccade les listes), squelette pendant le chargement
/// puis fondu à l'arrivée.
class ImageReseau extends StatelessWidget {
  final String url;
  final double? largeur;
  final double hauteur;
  final BoxFit fit;
  final WidgetBuilder? erreur;

  const ImageReseau(
    this.url, {
    super.key,
    this.largeur,
    required this.hauteur,
    this.fit = BoxFit.cover,
    this.erreur,
  });

  @override
  Widget build(BuildContext context) {
    final ratio = MediaQuery.devicePixelRatioOf(context);
    return LayoutBuilder(
      builder: (context, contraintes) {
        final l =
            largeur ??
            (contraintes.hasBoundedWidth ? contraintes.maxWidth : null);
        return Image.network(
          url,
          width: largeur,
          height: hauteur,
          fit: fit,
          cacheWidth: l != null && l.isFinite ? (l * ratio).round() : null,
          frameBuilder: (_, child, frame, synchrone) {
            if (synchrone) return child;
            return AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: frame == null
                  ? Squelette(
                      largeur: l ?? double.infinity,
                      hauteur: hauteur,
                      rayon: 0,
                    )
                  : child,
            );
          },
          errorBuilder: (context, _, __) =>
              erreur?.call(context) ??
              SizedBox(width: largeur, height: hauteur),
        );
      },
    );
  }
}
