import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../app_flavor.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_auth.dart';
import '../../services/google_auth_service.dart';
import '../../theme.dart';
import '../../widgets/champ.dart';
import '../../widgets/toast.dart';

/// Accueil type SENGA : téléphone → Continuer | ou | Continuer avec Google.
class BienvenueScreen extends StatefulWidget {
  const BienvenueScreen({super.key});

  @override
  State<BienvenueScreen> createState() => _BienvenueScreenState();
}

class _BienvenueScreenState extends State<BienvenueScreen> {
  final _telephoneCtrl = TextEditingController(text: '+243');
  bool _chargementGoogle = false;

  @override
  void dispose() {
    _telephoneCtrl.dispose();
    super.dispose();
  }

  void _continuer() {
    final tel = _telephoneCtrl.text.trim();
    if (tel.replaceAll(RegExp(r'\D'), '').length < 11) {
      ToastWidget.show(context, 'Numéro de téléphone invalide', type: 'erreur');
      return;
    }
    context.push('/inscription', extra: tel);
  }

  Future<void> _continuerAvecGoogle() async {
    setState(() => _chargementGoogle = true);
    final auth = context.read<AuthProvider>();
    try {
      final idToken = await GoogleAuthService.obtenirIdToken();
      if (idToken == null) {
        if (mounted) ToastWidget.show(context, 'Connexion Google annulée');
        return;
      }
      final data = await ApiAuth.connexionGoogle(idToken, role: AppFlavorConfig.roleApi);
      final token = data['token'] as String;
      final utilisateur = Utilisateur.fromJson(data['utilisateur'] as Map<String, dynamic>);
      if (!AppFlavorConfig.roleCompatible(utilisateur.role)) {
        throw Exception(
          AppFlavorConfig.estPrestataire
              ? 'Compte client détecté. Utilisez l\'app RESERVA (Client).'
              : 'Compte prestataire détecté. Utilisez l\'app RESERVA Pro.',
        );
      }
      await auth.connecterStore(token, utilisateur);
      if (!mounted) return;
      final pinRequis = data['pinRequis'] == true;
      if (pinRequis) {
        ToastWidget.show(context, 'Créez votre PIN pour les prochaines connexions', type: 'succes');
        context.go('/inscription', extra: {
          'etape': 'PIN',
          'telephone': utilisateur.telephone,
          'depuisGoogle': true,
        });
      } else {
        ToastWidget.show(context, 'Bienvenue ${utilisateur.nom}', type: 'succes');
        context.go('/accueil');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargementGoogle = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pro = AppFlavorConfig.estPrestataire;
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              color: AppCouleurs.primaireFonce,
              child: Text(
                AppFlavorConfig.nomApp,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18, letterSpacing: 1),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                child: Column(
                  children: [
                    Container(
                      width: 112,
                      height: 112,
                      decoration: BoxDecoration(
                        color: AppCouleurs.primaire,
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: [
                          BoxShadow(color: AppCouleurs.primaire.withValues(alpha: 0.35), blurRadius: 20, offset: const Offset(0, 8)),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Image.asset(
                        'assets/icon.png',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Center(
                          child: Text('R', style: TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w900)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      pro ? 'Bienvenue sur RESERVA Pro' : 'Bienvenue sur RESERVA',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppCouleurs.texte, height: 1.2),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      AppFlavorConfig.sloganAuth,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire, height: 1.4),
                    ),
                    const SizedBox(height: 28),
                    Champ(
                      libelle: 'Téléphone',
                      controller: _telephoneCtrl,
                      placeholder: '+243…',
                      keyboardType: TextInputType.phone,
                      prefixIcon: Icons.phone_outlined,
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          gradient: const LinearGradient(colors: [AppCouleurs.primaire, Color(0xFF3B82F6)]),
                        ),
                        child: ElevatedButton(
                          onPressed: _continuer,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('→  ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                              Text('Continuer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        const Expanded(child: Divider()),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text('ou', style: TextStyle(color: AppCouleurs.texteSecondaire, fontWeight: FontWeight.w600)),
                        ),
                        const Expanded(child: Divider()),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: OutlinedButton(
                        onPressed: _chargementGoogle ? null : _continuerAvecGoogle,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppCouleurs.primaire,
                          backgroundColor: AppCouleurs.blanc,
                          side: const BorderSide(color: AppCouleurs.bordure),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: _chargementGoogle
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  _LogoGoogle(),
                                  SizedBox(width: 10),
                                  Text(
                                    'Continuer avec Google',
                                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                                  ),
                                ],
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => context.go('/connexion'),
                      child: Text(
                        pro ? 'Déjà un compte ? Connexion PIN Pro' : 'Déjà un compte ? Connexion PIN',
                        style: const TextStyle(fontWeight: FontWeight.w700, color: AppCouleurs.primaire),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      alignment: WrapAlignment.center,
                      children: [
                        TextButton(
                          onPressed: () => context.push('/cgu'),
                          child: const Text('CGU', style: TextStyle(fontWeight: FontWeight.w700)),
                        ),
                        const Text(' · ', style: TextStyle(color: AppCouleurs.texteSecondaire)),
                        TextButton(
                          onPressed: () => context.push('/manuel'),
                          child: Text(pro ? 'Guide Pro' : 'Guide Client', style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LogoGoogle extends StatelessWidget {
  const _LogoGoogle();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppCouleurs.bordure),
        color: Colors.white,
      ),
      child: const Text(
        'G',
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w800,
          color: Color(0xFF4285F4),
          height: 1,
        ),
      ),
    );
  }
}
