import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../i18n.dart';
import '../../providers/langue_provider.dart';
import '../../services/api_auth.dart';
import '../../services/api_client.dart';
import '../../services/apple_auth_service.dart';
import '../../services/google_auth_service.dart';
import '../../providers/auth_provider.dart';
import '../../models/models.dart';
import '../../theme.dart';
import '../../app_flavor.dart';
import '../../widgets/champ.dart';
import '../../widgets/otp_champ.dart';
import '../../widgets/toast.dart';

class ConnexionScreen extends StatefulWidget {
  const ConnexionScreen({super.key});

  @override
  State<ConnexionScreen> createState() => _ConnexionScreenState();
}

class _ConnexionScreenState extends State<ConnexionScreen> {
  final _telephoneCtrl = TextEditingController(text: '+243');
  final _pinCtrl = TextEditingController();
  final _code2FACtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _afficher2FA = false;
  bool _chargement = false;
  bool _chargementGoogle = false;
  bool _chargementApple = false;
  /// Mode déverrouillage : téléphone mémorisé, focus PIN.
  bool _modeDeverrouillage = false;
  bool _pret = false;

  @override
  void initState() {
    super.initState();
    _chargerDernierTelephone();
  }

  Future<void> _chargerDernierTelephone() async {
    final tel = await ApiClient.getDernierTelephone();
    if (!mounted) return;
    if (tel != null && tel.trim().length >= 10) {
      setState(() {
        _telephoneCtrl.text = tel.trim();
        _modeDeverrouillage = true;
        _pret = true;
      });
    } else {
      setState(() => _pret = true);
    }
  }

  @override
  void dispose() {
    _telephoneCtrl.dispose();
    _pinCtrl.dispose();
    _code2FACtrl.dispose();
    super.dispose();
  }

  Future<void> _connecter() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _chargement = true);
    final auth = context.read<AuthProvider>();
    try {
      final data = await ApiAuth.connecter(_telephoneCtrl.text.trim(), _pinCtrl.text.trim());
      if (data.containsKey('deuxfaRequis') && data['deuxfaRequis'] == true) {
        if (mounted) setState(() => _afficher2FA = true);
        if (mounted) ToastWidget.show(context, AppTraductions.t('code2FAEnvoye'), type: 'succes');
        return;
      }
      final token = data['token'] as String;
      final utilisateur = Utilisateur.fromJson(data['utilisateur'] as Map<String, dynamic>);
      if (!AppFlavorConfig.roleCompatible(utilisateur.role)) {
        throw Exception(
          AppFlavorConfig.estPrestataire
              ? 'Compte client détecté. Installez / ouvrez l\'app RESERVA (Client).'
              : 'Compte prestataire détecté. Installez / ouvrez l\'app RESERVA Pro.',
        );
      }
      await auth.connecterStore(token, utilisateur);
      if (mounted) {
        ToastWidget.show(context, AppTraductions.t('bonRetourNom').replaceAll('%s', utilisateur.nom), type: 'succes');
        context.go('/accueil');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _verifier2FA() async {
    setState(() => _chargement = true);
    final auth = context.read<AuthProvider>();
    try {
      final data = await ApiAuth.verifier2FA(_telephoneCtrl.text.trim(), _code2FACtrl.text.trim());
      final token = data['token'] as String;
      final utilisateur = Utilisateur.fromJson(data['utilisateur'] as Map<String, dynamic>);
      if (!AppFlavorConfig.roleCompatible(utilisateur.role)) {
        throw Exception('Ce compte ne correspond pas à cette application.');
      }
      await auth.connecterStore(token, utilisateur);
      if (mounted) {
        ToastWidget.show(context, AppTraductions.t('auth2FAReussie'), type: 'succes');
        context.go('/accueil');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
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
    context.watch<LangueProvider>();
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
              color: AppCouleurs.primaireFonce,
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.go('/bienvenue'),
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                  ),
                  Expanded(
                    child: Text(
                      AppFlavorConfig.nomApp,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            Expanded(
              child: !_pret
                  ? const Center(child: CircularProgressIndicator())
                  : SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _modeDeverrouillage
                                  ? 'Entrez votre PIN'
                                  : (AppFlavorConfig.estPrestataire ? 'Connexion Pro' : 'Connexion'),
                              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppCouleurs.texte),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _modeDeverrouillage
                                  ? 'Déverrouillez votre session avec votre code PIN à 4 chiffres.'
                                  : 'Connectez-vous avec votre téléphone et votre PIN — sans SMS.',
                              style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire, height: 1.4),
                            ),
                            const SizedBox(height: 24),
                            _afficher2FA ? _formulaire2FA() : _formulaireConnexion(),
                          ],
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _boutonPrincipal(String label, VoidCallback onPressed) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          gradient: const LinearGradient(colors: [AppCouleurs.primaire, Color(0xFF3B82F6)]),
        ),
        child: ElevatedButton(
          onPressed: _chargement ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: _chargement
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('→  ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _formulaireConnexion() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_modeDeverrouillage) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppCouleurs.blanc,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppCouleurs.bordure),
            ),
            child: Row(
              children: [
                Icon(Icons.phone_iphone, color: AppCouleurs.primaire),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _telephoneCtrl.text,
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppCouleurs.texte),
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() {
                    _modeDeverrouillage = false;
                    _pinCtrl.clear();
                  }),
                  child: const Text('Changer', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ] else ...[
          Champ(
            libelle: AppTraductions.t('telephone'),
            placeholder: '+243…',
            controller: _telephoneCtrl,
            keyboardType: TextInputType.phone,
            prefixIcon: Icons.phone_outlined,
            validator: (v) => v == null || v.trim().isEmpty ? AppTraductions.t('telephoneRequis') : null,
          ),
          const SizedBox(height: 12),
        ],
        Champ(
          libelle: AppTraductions.t('codePin'),
          placeholder: '••••',
          controller: _pinCtrl,
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 4,
          prefixIcon: Icons.lock_outline,
          validator: (v) => v == null || v.trim().length != 4 ? AppTraductions.t('pin4Chiffres') : null,
        ),
        const SizedBox(height: 16),
        _boutonPrincipal(
          _modeDeverrouillage ? 'Déverrouiller' : AppTraductions.t('seConnecter'),
          _connecter,
        ),
        const SizedBox(height: 4),
        Center(
          child: TextButton(
            onPressed: () => context.go(
              '/reinitialiser-pin',
              // Préremplir via query n'est pas supporté ; stock déjà connu côté écran PIN oublié
            ),
            child: Text(
              AppTraductions.t('motDePasseOublie'),
              style: const TextStyle(
                color: AppCouleurs.primaire,
                fontWeight: FontWeight.w700,
                fontSize: 15,
                decoration: TextDecoration.underline,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
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
        _boutonsOAuth(),
        const SizedBox(height: 8),
        Center(
          child: TextButton(
            onPressed: () => context.go('/inscription'),
            child: Text(
              AppTraductions.t('inscrivezVous'),
              style: const TextStyle(color: AppCouleurs.primaire, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    );
  }

  Widget _boutonsOAuth() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 52,
          child: OutlinedButton(
            onPressed: (_chargement || _chargementGoogle || _chargementApple) ? null : _continuerAvecGoogle,
            style: OutlinedButton.styleFrom(
              foregroundColor: AppCouleurs.primaire,
              backgroundColor: AppCouleurs.blanc,
              side: BorderSide(color: AppCouleurs.bordure),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: _chargementGoogle
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _LogoGoogle(),
                      SizedBox(width: 10),
                      Text('Continuer avec Google', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
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
              onPressed: (_chargement || _chargementGoogle || _chargementApple) ? null : _continuerAvecApple,
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
                        Text('Continuer avec Apple', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                      ],
                    ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _formulaire2FA() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(AppTraductions.t('codeEnvoyeSMS'), style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
        const SizedBox(height: 12),
        OtpChamp(
          libelle: AppTraductions.t('code2FA'),
          controller: _code2FACtrl,
          onCompleted: (_) => _verifier2FA(),
        ),
        const SizedBox(height: 16),
        _boutonPrincipal(AppTraductions.t('verifier'), _verifier2FA),
      ],
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
