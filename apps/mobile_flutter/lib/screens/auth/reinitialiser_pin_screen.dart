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

class ReinitialiserPinScreen extends StatefulWidget {
  const ReinitialiserPinScreen({super.key});

  @override
  State<ReinitialiserPinScreen> createState() => _ReinitialiserPinScreenState();
}

class _ReinitialiserPinScreenState extends State<ReinitialiserPinScreen> {
  String _etape = 'TELEPHONE';
  bool _chargement = false;
  final _telephoneCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _nouveauPinCtrl = TextEditingController();
  final _confirmationPinCtrl = TextEditingController();

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
      await ApiAuth.demanderReinitialisationPin(_telephoneCtrl.text.trim());
      if (mounted) {
        ToastWidget.show(context, 'Code de réinitialisation envoyé par SMS.', type: 'succes');
        setState(() => _etape = 'OTP');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
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
              const Text('Entrez votre numéro de téléphone pour recevoir un code de vérification.', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
              const SizedBox(height: 12),
              Champ(libelle: 'Numéro de téléphone', controller: _telephoneCtrl, placeholder: 'Ex: 0991234567', keyboardType: TextInputType.phone),
              const SizedBox(height: 8),
              Bouton(titre: 'Envoyer le code', onPressed: _demander, chargement: _chargement),
            ],
            if (_etape == 'OTP') ...[
              const Text('Entrez le code reçu par SMS.', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
              const SizedBox(height: 12),
              Champ(libelle: 'Code de vérification', controller: _codeCtrl, keyboardType: TextInputType.number, maxLength: 6),
              const SizedBox(height: 8),
              Bouton(titre: 'Vérifier', onPressed: () => setState(() => _etape = 'NOUVEAU_PIN'), desactive: _codeCtrl.text.length < 6),
            ],
            if (_etape == 'NOUVEAU_PIN') ...[
              const Text('Choisissez un nouveau code PIN à 4 chiffres.', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
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
