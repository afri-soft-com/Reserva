import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../i18n.dart';
import '../../providers/langue_provider.dart';
import '../../services/api_auth.dart';
import '../../providers/auth_provider.dart';
import '../../models/models.dart';
import '../../theme.dart';
import '../../widgets/champ.dart';
import '../../widgets/bouton.dart';
import '../../widgets/toast.dart';

class ConnexionScreen extends StatefulWidget {
  const ConnexionScreen({super.key});

  @override
  State<ConnexionScreen> createState() => _ConnexionScreenState();
}

class _ConnexionScreenState extends State<ConnexionScreen> {
  final _telephoneCtrl = TextEditingController();
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
      backgroundColor: AppCouleurs.blanc,
      appBar: AppBar(title: Text(AppTraductions.t('connexion'))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(AppTraductions.t('bonRetour'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppCouleurs.primaireFonce)),
            const SizedBox(height: 4),
            Text(AppTraductions.t('connectezVousCompte'), style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 24),
            Form(
              key: _formKey,
              child: _afficher2FA ? _formulaire2FA() : _formulaireConnexion(),
            ),
          ],
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
          placeholder: 'Ex: 0991234567',
          controller: _telephoneCtrl,
          keyboardType: TextInputType.phone,
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
          validator: (v) => v == null || v.trim().length != 4 ? AppTraductions.t('pin4Chiffres') : null,
        ),
        const SizedBox(height: 8),
        Bouton(titre: AppTraductions.t('seConnecter'), onPressed: _connecter, chargement: _chargement),
        const SizedBox(height: 12),
        Center(
          child: TextButton(
            onPressed: () => context.go('/reinitialiser-pin'),
            child: Text(AppTraductions.t('motDePasseOublie'), style: const TextStyle(color: AppCouleurs.primaire, fontWeight: FontWeight.w600)),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(AppTraductions.t('pasEncoreCompte'), style: const TextStyle(color: AppCouleurs.texteSecondaire)),
              GestureDetector(
                onTap: () => context.go('/inscription'),
                child: Text(AppTraductions.t('inscrivezVous'), style: const TextStyle(color: AppCouleurs.primaire, fontWeight: FontWeight.w600, decoration: TextDecoration.underline)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _formulaire2FA() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(AppTraductions.t('authDeuxFacteurs'), style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
        const SizedBox(height: 4),
        Text(AppTraductions.t('codeEnvoyeSMS'), style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
        const SizedBox(height: 12),
        Champ(
          libelle: AppTraductions.t('code2FA'),
          controller: _code2FACtrl,
          keyboardType: TextInputType.number,
          maxLength: 6,
        ),
        const SizedBox(height: 8),
        Bouton(titre: AppTraductions.t('verifier'), onPressed: _verifier2FA, chargement: _chargement),
      ],
    );
  }
}
