import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_auth.dart';
import '../../widgets/toast.dart';

class ChangerPinScreen extends StatefulWidget {
  const ChangerPinScreen({super.key});

  @override
  State<ChangerPinScreen> createState() => _ChangerPinScreenState();
}

class _ChangerPinScreenState extends State<ChangerPinScreen> {
  String _etape = 'OTP';
  bool _chargement = false;
  final _codeCtrl = TextEditingController();
  final _nouveauPinCtrl = TextEditingController();
  final _confirmationPinCtrl = TextEditingController();

  @override
  void dispose() {
    _codeCtrl.dispose();
    _nouveauPinCtrl.dispose();
    _confirmationPinCtrl.dispose();
    super.dispose();
  }

  Future<void> _demanderCode() async {
    final telephone = context.read<AuthProvider>().utilisateur?.telephone;
    if (telephone == null) return;
    setState(() => _chargement = true);
    try {
      await ApiAuth.demanderReinitialisationPin(telephone);
      if (mounted) ToastWidget.show(context, 'Code de vérification envoyé par SMS.', type: 'succes');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _verifierEtChanger() async {
    if (_nouveauPinCtrl.text.length != 4 || _confirmationPinCtrl.text.length != 4) {
      ToastWidget.show(context, 'Le code PIN doit contenir 4 chiffres.', type: 'erreur');
      return;
    }
    if (_nouveauPinCtrl.text != _confirmationPinCtrl.text) {
      ToastWidget.show(context, 'Les codes PIN ne correspondent pas.', type: 'erreur');
      return;
    }
    final telephone = context.read<AuthProvider>().utilisateur?.telephone;
    if (telephone == null) return;
    setState(() => _chargement = true);
    try {
      final data = await ApiAuth.reinitialiserPin(telephone, _codeCtrl.text.trim(), _nouveauPinCtrl.text.trim());
      final token = data['token'] as String;
      if (!mounted) return;
      final auth = context.read<AuthProvider>();
      await auth.connecterStore(token, auth.utilisateur!, prestataire: auth.prestataire);
      if (mounted) {
        ToastWidget.show(context, 'Code PIN modifié avec succès.', type: 'succes');
        context.pop();
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
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Changer mon code PIN')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.lock_outline, size: 48, color: AppCouleurs.primaire),
            const SizedBox(height: 16),
            const Text('Modification du code PIN', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text('Un code de vérification sera envoyé par SMS.', style: TextStyle(color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 24),
            if (_etape == 'OTP') ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _chargement ? null : _demanderCode,
                  icon: _chargement
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.send),
                  label: const Text('Envoyer le code de vérification'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppCouleurs.primaire, foregroundColor: AppCouleurs.blanc,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text('Code de vérification', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 6),
              TextField(
                controller: _codeCtrl,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: InputDecoration(
                  hintText: 'Code à 6 chiffres',
                  filled: true, fillColor: AppCouleurs.blanc,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (_codeCtrl.text.trim().length == 6) setState(() => _etape = 'NOUVEAU_PIN');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppCouleurs.primaire, foregroundColor: AppCouleurs.blanc,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Continuer'),
                ),
              ),
            ],
            if (_etape == 'NOUVEAU_PIN') ...[
              const Text('Nouveau code PIN à 4 chiffres', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
              const SizedBox(height: 12),
              TextField(
                controller: _nouveauPinCtrl,
                obscureText: true,
                keyboardType: TextInputType.number,
                maxLength: 4,
                decoration: InputDecoration(
                  hintText: 'Nouveau PIN',
                  filled: true, fillColor: AppCouleurs.blanc,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _confirmationPinCtrl,
                obscureText: true,
                keyboardType: TextInputType.number,
                maxLength: 4,
                decoration: InputDecoration(
                  hintText: 'Confirmer le nouveau PIN',
                  filled: true, fillColor: AppCouleurs.blanc,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _chargement ? null : _verifierEtChanger,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppCouleurs.succes, foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _chargement
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Confirmer le changement'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
