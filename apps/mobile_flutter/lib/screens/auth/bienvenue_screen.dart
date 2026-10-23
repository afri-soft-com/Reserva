import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../app_flavor.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_auth.dart';
import '../../services/apple_auth_service.dart';
import '../../services/google_auth_service.dart';
import '../../theme.dart';
import '../../widgets/champ.dart';
import '../../widgets/toast.dart';

/// Accueil type SENGA : téléphone → Continuer | ou | Google / Apple (iOS).
class BienvenueScreen extends StatefulWidget {
  const BienvenueScreen({super.key});

  @override
  State<BienvenueScreen> createState() => _BienvenueScreenState();
}

class _BienvenueScreenState extends State<BienvenueScreen> {
  final _telephoneCtrl = TextEditingController(text: '+243');
  bool _chargementGoogle = false;
  bool _chargementApple = false;
  bool _accepteLegal = false;

  @override
  void dispose() {
    _telephoneCtrl.dispose();
    super.dispose();
  }

  bool _assurerLegal() {
    if (_accepteLegal) return true;
    ToastWidget.show(
      context,
      'Acceptez les CGU et la Politique de confidentialité pour continuer',
      type: 'erreur',
    );
    return false;
  }

  void _continuer() {
    if (!_assurerLegal()) return;
    final tel = _telephoneCtrl.text.trim();
    if (tel.replaceAll(RegExp(r'\D'), '').length < 11) {
      ToastWidget.show(context, 'Numéro de téléphone invalide', type: 'erreur');
      return;
    }
    context.push('/inscription', extra: tel);
  }

  Future<void> _apresOAuth(Map<String, dynamic> data) async {
    final auth = context.read<AuthProvider>();
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
  }

  Future<void> _continuerAvecGoogle() async {
    if (!_assurerLegal()) return;
    setState(() => _chargementGoogle = true);
    try {
      final idToken = await GoogleAuthService.obtenirIdToken();
      if (idToken == null) {
        if (mounted) ToastWidget.show(context, 'Connexion Google annulée');
        return;
      }
      final data = await ApiAuth.connexionGoogle(idToken, role: AppFlavorConfig.roleApi);
      await _apresOAuth(data);
    } catch (e) {
      if (mounted) {
        ToastWidget.show(context, GoogleAuthService.messageErreur(e), type: 'erreur');
      }
    } finally {
      if (mounted) setState(() => _chargementGoogle = false);
    }
  }

  Future<void> _continuerAvecApple() async {
    if (!_assurerLegal()) return;
    setState(() => _chargementApple = true);
    try {
      final cred = await AppleAuthService.obtenirCredentials();
      if (cred == null) {
        if (mounted) ToastWidget.show(context, 'Connexion Apple annulée');
        return;
      }
      final data = await ApiAuth.connexionApple(
        cred.identityToken,
        nom: cred.nom,
        role: AppFlavorConfig.roleApi,
      );
      await _apresOAuth(data);
    } catch (e) {
      if (mounted) {
        ToastWidget.show(context, AppleAuthService.messageErreur(e), type: 'erreur');
      }
    } finally {
      if (mounted) setState(() => _chargementApple = false);
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
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: Checkbox(
                            value: _accepteLegal,
                            activeColor: AppCouleurs.primaire,
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            onChanged: (v) => setState(() => _accepteLegal = v ?? false),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              const Text("J'ai lu et j'accepte les ", style: TextStyle(fontSize: 13)),
                              GestureDetector(
                                onTap: () => context.push('/cgu'),
                                child: const Text(
                                  'CGU',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppCouleurs.primaire,
                                    fontWeight: FontWeight.w700,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                              const Text(' et la ', style: TextStyle(fontSize: 13)),
                              GestureDetector(
                                onTap: () => context.push('/confidentialite'),
                                child: const Text(
                                  'Politique de confidentialité',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppCouleurs.primaire,
                                    fontWeight: FontWeight.w700,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                              const Text('.', style: TextStyle(fontSize: 13)),
                            ],
                          ),
                        ),
                      ],
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
                          onPressed: _accepteLegal ? _continuer : null,
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
                        onPressed: (!_accepteLegal || _chargementGoogle || _chargementApple)
                            ? null
                            : _continuerAvecGoogle,
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
                    if (AppleAuthService.estDisponible) ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: (!_accepteLegal || _chargementGoogle || _chargementApple)
                              ? null
                              : _continuerAvecApple,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.black,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: Colors.black54,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: _chargementApple
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.apple, size: 22),
                                    SizedBox(width: 10),
                                    Text(
                                      'Continuer avec Apple',
                                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                    ],
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
                          onPressed: () => context.push('/confidentialite'),
                          child: const Text('Confidentialité', style: TextStyle(fontWeight: FontWeight.w700)),
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
