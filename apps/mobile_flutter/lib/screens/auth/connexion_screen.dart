import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../i18n.dart';
import '../../providers/langue_provider.dart';
import '../../services/api_auth.dart';
import '../../providers/auth_provider.dart';
import '../../models/models.dart';
import '../../theme.dart';
import '../../app_flavor.dart';
import '../../widgets/champ.dart';
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
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        AppFlavorConfig.estPrestataire ? 'Connexion Pro' : 'Connexion',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppCouleurs.texte),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Connectez-vous avec votre téléphone et votre PIN — sans SMS.',
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
        Champ(
          libelle: AppTraductions.t('telephone'),
          placeholder: '+243…',
          controller: _telephoneCtrl,
          keyboardType: TextInputType.phone,
          prefixIcon: Icons.phone_outlined,
          validator: (v) => v == null || v.trim().isEmpty ? AppTraductions.t('telephoneRequis') : null,
        ),
        const SizedBox(height: 12),
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
        _boutonPrincipal(AppTraductions.t('seConnecter'), _connecter),
        const SizedBox(height: 8),
        Center(
          child: TextButton(
            onPressed: () => context.go('/reinitialiser-pin'),
            child: Text(AppTraductions.t('motDePasseOublie'), style: const TextStyle(color: AppCouleurs.primaire, fontWeight: FontWeight.w600)),
          ),
        ),
        const SizedBox(height: 8),
        const Row(
          children: [
            Expanded(child: Divider()),
            Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Text('ou', style: TextStyle(color: AppCouleurs.texteSecondaire))),
            Expanded(child: Divider()),
          ],
        ),
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
        Center(
          child: TextButton(
            onPressed: () => context.push('/manuel'),
            child: const Text('Manuel utilisateur', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ),
      ],
    );
  }

  Widget _formulaire2FA() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(AppTraductions.t('codeEnvoyeSMS'), style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
        const SizedBox(height: 12),
        Champ(libelle: AppTraductions.t('code2FA'), controller: _code2FACtrl, keyboardType: TextInputType.number, maxLength: 6, prefixIcon: Icons.sms_outlined),
        const SizedBox(height: 16),
        _boutonPrincipal(AppTraductions.t('verifier'), _verifier2FA),
      ],
    );
  }
}
