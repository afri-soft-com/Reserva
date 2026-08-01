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

class InscriptionScreen extends StatefulWidget {
  const InscriptionScreen({super.key});

  @override
  State<InscriptionScreen> createState() => _InscriptionScreenState();
}

class _InscriptionScreenState extends State<InscriptionScreen> {
  String _etape = 'FORMULAIRE';
  bool _chargement = false;
  final _nomCtrl = TextEditingController();
  final _telephoneCtrl = TextEditingController();
  final _codeParrainageCtrl = TextEditingController();
  final _codeOtpCtrl = TextEditingController();
  final _pinCtrl = TextEditingController();
  final _confirmationPinCtrl = TextEditingController();

  @override
  void dispose() {
    _nomCtrl.dispose();
    _telephoneCtrl.dispose();
    _codeParrainageCtrl.dispose();
    _codeOtpCtrl.dispose();
    _pinCtrl.dispose();
    _confirmationPinCtrl.dispose();
    super.dispose();
  }

  Future<void> _gererFormulaire() async {
    setState(() => _chargement = true);
    try {
      await ApiAuth.inscrire(
        _telephoneCtrl.text.trim(),
        _nomCtrl.text.trim(),
        codeParrainage: _codeParrainageCtrl.text.trim(),
      );
      if (mounted) {
        ToastWidget.show(context, 'Code de vérification envoyé par SMS.', type: 'succes');
        setState(() => _etape = 'OTP');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _gererOtp() async {
    setState(() => _chargement = true);
    try {
      await ApiAuth.verifierOtp(_telephoneCtrl.text.trim(), _codeOtpCtrl.text.trim());
      if (mounted) {
        ToastWidget.show(context, 'Numéro vérifié !', type: 'succes');
        setState(() => _etape = 'PIN');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _gererPin() async {
    if (_pinCtrl.text != _confirmationPinCtrl.text) {
      ToastWidget.show(context, 'Les codes PIN ne correspondent pas.', type: 'erreur');
      return;
    }
    setState(() => _chargement = true);
    final auth = context.read<AuthProvider>();
    try {
      final data = await ApiAuth.definirPin(_telephoneCtrl.text.trim(), _pinCtrl.text.trim());
      final token = data['token'] as String;
      final utilisateur = Utilisateur.fromJson(data['utilisateur'] as Map<String, dynamic>);
      await auth.connecterStore(token, utilisateur);
      if (mounted) {
        ToastWidget.show(context, 'Bienvenue sur RESERVA !', type: 'succes');
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
      appBar: AppBar(title: const Text('Inscription')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Créer un compte', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppCouleurs.primaireFonce)),
            const SizedBox(height: 24),
            if (_etape == 'FORMULAIRE') ...[
              Champ(libelle: 'Nom complet', controller: _nomCtrl, placeholder: 'Ex: Jean Mukendi'),
              const SizedBox(height: 12),
              Champ(libelle: 'Numéro de téléphone', controller: _telephoneCtrl, placeholder: 'Ex: 0991234567', keyboardType: TextInputType.phone),
              const SizedBox(height: 12),
              Champ(libelle: 'Code de parrainage (optionnel)', controller: _codeParrainageCtrl, placeholder: 'Ex: RESV-JEAN-1234'),
              const SizedBox(height: 8),
              Bouton(titre: 'Continuer', onPressed: _gererFormulaire, chargement: _chargement),
            ],
            if (_etape == 'OTP') ...[
              Text('Entrez le code envoyé au ${_telephoneCtrl.text}', style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
              const SizedBox(height: 12),
              Champ(libelle: 'Code de vérification', controller: _codeOtpCtrl, keyboardType: TextInputType.number, maxLength: 6),
              const SizedBox(height: 8),
              Bouton(titre: 'Vérifier', onPressed: _gererOtp, chargement: _chargement),
              const SizedBox(height: 8),
              Center(
                child: TextButton(
                  onPressed: () => ApiAuth.renvoyerOtp(_telephoneCtrl.text.trim()),
                  child: const Text('Renvoyer le code', style: TextStyle(color: AppCouleurs.primaire, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
            if (_etape == 'PIN') ...[
              const Text('Choisissez un code PIN à 4 chiffres', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
              const SizedBox(height: 12),
              Champ(libelle: 'Code PIN', controller: _pinCtrl, obscureText: true, keyboardType: TextInputType.number, maxLength: 4),
              const SizedBox(height: 12),
              Champ(libelle: 'Confirmez le PIN', controller: _confirmationPinCtrl, obscureText: true, keyboardType: TextInputType.number, maxLength: 4),
              const SizedBox(height: 8),
              Bouton(titre: "Terminer l'inscription", onPressed: _gererPin, chargement: _chargement),
            ],
            const SizedBox(height: 24),
            Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Déjà un compte ? ", style: TextStyle(color: AppCouleurs.texteSecondaire)),
                  GestureDetector(
                    onTap: () => context.go('/connexion'),
                    child: const Text("Connectez-vous", style: TextStyle(color: AppCouleurs.primaire, fontWeight: FontWeight.w600, decoration: TextDecoration.underline)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
