import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
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
        if (mounted) ToastWidget.show(context, 'Code 2FA envoyé par SMS.', type: 'succes');
        return;
      }
      final token = data['token'] as String;
      final utilisateur = Utilisateur.fromJson(data['utilisateur'] as Map<String, dynamic>);
      await auth.connecterStore(token, utilisateur);
      if (mounted) {
        ToastWidget.show(context, 'Bon retour, ${utilisateur.nom} !', type: 'succes');
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
        ToastWidget.show(context, 'Authentification 2FA réussie !', type: 'succes');
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
    return Scaffold(
      backgroundColor: AppCouleurs.blanc,
      appBar: AppBar(title: const Text('Connexion')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Bon retour !', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppCouleurs.primaireFonce)),
            const SizedBox(height: 4),
            const Text('Connectez-vous à votre compte RESERVA', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
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
          libelle: 'Numéro de téléphone',
          placeholder: 'Ex: 0991234567',
          controller: _telephoneCtrl,
          keyboardType: TextInputType.phone,
          validator: (v) => v == null || v.trim().isEmpty ? 'Téléphone requis' : null,
        ),
        const SizedBox(height: 12),
        Champ(
          libelle: 'Code PIN',
          placeholder: '••••',
          controller: _pinCtrl,
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 4,
          validator: (v) => v == null || v.trim().length != 4 ? 'Le PIN doit contenir 4 chiffres' : null,
        ),
        const SizedBox(height: 8),
        Bouton(titre: 'Se connecter', onPressed: _connecter, chargement: _chargement),
        const SizedBox(height: 12),
        Center(
          child: TextButton(
            onPressed: () => context.go('/reinitialiser-pin'),
            child: const Text('Mot de passe oublié ?', style: TextStyle(color: AppCouleurs.primaire, fontWeight: FontWeight.w600)),
          ),
        ),
      ],
    );
  }

  Widget _formulaire2FA() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Authentification à deux facteurs', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
        const SizedBox(height: 4),
        const Text('Un code de vérification a été envoyé par SMS.', style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
        const SizedBox(height: 12),
        Champ(
          libelle: 'Code 2FA',
          controller: _code2FACtrl,
          keyboardType: TextInputType.number,
          maxLength: 6,
        ),
        const SizedBox(height: 8),
        Bouton(titre: 'Vérifier', onPressed: _verifier2FA, chargement: _chargement),
      ],
    );
  }
}
