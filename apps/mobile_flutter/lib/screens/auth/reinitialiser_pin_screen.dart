import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../app_flavor.dart';
import '../../services/api_auth.dart';
import '../../services/api_client.dart';
import '../../services/apple_auth_service.dart';
import '../../services/google_auth_service.dart';
import '../../providers/auth_provider.dart';
import '../../models/models.dart';
import '../../theme.dart';
import '../../widgets/champ.dart';
import '../../widgets/otp_champ.dart';
import '../../widgets/bouton.dart';
import '../../widgets/toast.dart';

class ReinitialiserPinScreen extends StatefulWidget {
  const ReinitialiserPinScreen({super.key});

  @override
  State<ReinitialiserPinScreen> createState() => _ReinitialiserPinScreenState();
}

class _ReinitialiserPinScreenState extends State<ReinitialiserPinScreen> {
  String _etape = 'TELEPHONE';
  bool _chargement = false;
  bool _chargementGoogle = false;
  bool _chargementApple = false;
  final _telephoneCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _nouveauPinCtrl = TextEditingController();
  final _confirmationPinCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _codeCtrl.addListener(() => setState(() {}));
    _prefillTelephone();
  }

  Future<void> _prefillTelephone() async {
    final tel = await ApiClient.getDernierTelephone();
    if (!mounted) return;
    if (tel != null && tel.trim().length >= 10) {
      setState(() => _telephoneCtrl.text = tel.trim());
    }
  }

  @override
  void dispose() {
    _telephoneCtrl.dispose();
    _codeCtrl.dispose();
    _nouveauPinCtrl.dispose();
    _confirmationPinCtrl.dispose();
    super.dispose();
  }

  Future<void> _demander() async {
    setState(() => _chargement = true);
    try {
      final hash = await obtenirSmsAppHash();
      if (!mounted) return;
      setState(() => _etape = 'OTP');
      await Future<void>.delayed(const Duration(milliseconds: 300));
      final data = await ApiAuth.demanderReinitialisationPin(
        _telephoneCtrl.text.trim(),
        smsAppHash: hash,
      );
      if (!mounted) return;
      final smsOk = data['smsEnvoye'] != false;
      final codeEcran = data['codeOtp']?.toString();
      if (codeEcran != null && codeEcran.length == 6) {
        _codeCtrl.text = codeEcran;
      }
      ToastWidget.show(
        context,
        smsOk
            ? 'Code de réinitialisation envoyé par SMS.'
            : codeEcran != null
                ? 'SMS indisponible — votre code : $codeEcran'
                : 'Service SMS momentanément indisponible. Réessayez dans une minute.',
        type: smsOk || codeEcran != null ? 'succes' : 'erreur',
      );
    } catch (e) {
      if (mounted) {
        setState(() => _etape = 'TELEPHONE');
        var msg = e.toString().replaceFirst(RegExp(r'^Exception:\s*'), '');
        ToastWidget.show(context, msg, type: 'erreur');
      }
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _reinitialiser() async {
    if (_nouveauPinCtrl.text != _confirmationPinCtrl.text) {
      ToastWidget.show(context, 'Les codes PIN ne correspondent pas.', type: 'erreur');
      return;
    }
    setState(() => _chargement = true);
    final auth = context.read<AuthProvider>();
    try {
      final data = await ApiAuth.reinitialiserPin(
        _telephoneCtrl.text.trim(), _codeCtrl.text.trim(), _nouveauPinCtrl.text.trim(),
      );
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
      if (mounted) {
        ToastWidget.show(context, 'Code PIN réinitialisé avec succès !', type: 'succes');
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.blanc,
      appBar: AppBar(title: const Text('Réinitialiser le code PIN')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Réinitialiser le code PIN', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppCouleurs.primaireFonce)),
            const SizedBox(height: 24),
            if (_etape == 'TELEPHONE') ...[
              Text('Entrez votre numéro de téléphone pour recevoir un code de vérification.', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
              const SizedBox(height: 12),
              Champ(libelle: 'Numéro de téléphone', controller: _telephoneCtrl, placeholder: 'Ex: 0991234567', keyboardType: TextInputType.phone),
              const SizedBox(height: 8),
              Bouton(titre: 'Envoyer le code', onPressed: _demander, chargement: _chargement),
              const SizedBox(height: 20),
              Row(
                children: [
                  const Expanded(child: Divider()),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text('ou se reconnecter avec', style: TextStyle(color: AppCouleurs.texteSecondaire, fontWeight: FontWeight.w600)),
                  ),
                  const Expanded(child: Divider()),
                ],
              ),
              const SizedBox(height: 16),
              _boutonsOAuth(),
              const SizedBox(height: 8),
              Center(
                child: TextButton(
                  onPressed: () => context.go('/connexion'),
                  child: Text(
                    'Retour à la connexion PIN',
                    style: TextStyle(color: AppCouleurs.primaire, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
            if (_etape == 'OTP') ...[
              Text('Entrez le code reçu par SMS.', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
              const SizedBox(height: 12),
              OtpChamp(libelle: 'Code de vérification', controller: _codeCtrl),
              const SizedBox(height: 8),
              Bouton(titre: 'Vérifier', onPressed: () => setState(() => _etape = 'NOUVEAU_PIN'), desactive: _codeCtrl.text.length < 6),
            ],
            if (_etape == 'NOUVEAU_PIN') ...[
              Text('Choisissez un nouveau code PIN à 4 chiffres.', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
              const SizedBox(height: 12),
              Champ(libelle: 'Nouveau code PIN', controller: _nouveauPinCtrl, obscureText: true, keyboardType: TextInputType.number, maxLength: 4),
              const SizedBox(height: 12),
              Champ(libelle: 'Confirmez le code PIN', controller: _confirmationPinCtrl, obscureText: true, keyboardType: TextInputType.number, maxLength: 4),
              const SizedBox(height: 8),
              Bouton(titre: 'Réinitialiser', onPressed: _reinitialiser, chargement: _chargement),
            ],
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
