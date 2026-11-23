import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';

/// Mode invité (App Store 5.1.1(v)) : on parcourt sans compte, et le compte n'est demandé
/// qu'au moment d'une action liée au compte (réserver, payer, favoris, messages…).
///
/// Renvoie true si l'utilisateur est connecté. Sinon, propose de se connecter ou de créer
/// un compte et mémorise la page courante pour y revenir après la connexion.
Future<bool> exigerConnexion(BuildContext context, {required String raison}) async {
  final auth = context.read<AuthProvider>();
  if (auth.estConnecte) return true;
  String? retour;
  try {
    retour = GoRouterState.of(context).uri.toString();
  } catch (_) {
    retour = null;
  }
  final choix = await showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (ctx) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.lock_outline, size: 36, color: AppCouleurs.primaire),
            const SizedBox(height: 12),
            const Text('Compte nécessaire',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('Connectez-vous ou créez un compte gratuit pour $raison.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, '/connexion'),
              child: const Text('Se connecter'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => Navigator.pop(ctx, '/inscription'),
              child: const Text('Créer un compte'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Continuer sans compte'),
            ),
          ],
        ),
      ),
    ),
  );
  if (choix == null || !context.mounted) return false;
  auth.routeApresConnexion = retour;
  context.push(choix);
  return false;
}

/// Contenu d'un onglet réservé aux comptes (Réservations, Profil) en mode invité.
class InvitationConnexion extends StatelessWidget {
  final IconData icone;
  final String titre;
  final String message;

  const InvitationConnexion({super.key, required this.icone, required this.titre, required this.message});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: Text(titre)),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icone, size: 56, color: AppCouleurs.primaire),
              const SizedBox(height: 16),
              Text(message,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, color: AppCouleurs.texteSecondaire)),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push('/connexion'),
                  child: const Text('Se connecter'),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.push('/inscription'),
                  child: const Text('Créer un compte'),
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 4,
                alignment: WrapAlignment.center,
                children: [
                  TextButton(onPressed: () => context.push('/cgu'), child: const Text('Conditions')),
                  TextButton(onPressed: () => context.push('/confidentialite'), child: const Text('Confidentialité')),
                  TextButton(onPressed: () => context.push('/manuel'), child: const Text('Aide')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
