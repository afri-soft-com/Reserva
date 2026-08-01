import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../services/api_cartes_cadeaux.dart';
import '../../widgets/toast.dart';

class AcheterCarteCadeauScreen extends StatefulWidget {
  const AcheterCarteCadeauScreen({super.key});

  @override
  State<AcheterCarteCadeauScreen> createState() => _AcheterCarteCadeauScreenState();
}

class _AcheterCarteCadeauScreenState extends State<AcheterCarteCadeauScreen> {
  final _montantCtrl = TextEditingController();
  final _beneficiaireCtrl = TextEditingController();
  String _devise = 'USD';
  bool _chargement = false;

  @override
  void dispose() {
    _montantCtrl.dispose();
    _beneficiaireCtrl.dispose();
    super.dispose();
  }

  Future<void> _acheter() async {
    final montant = double.tryParse(_montantCtrl.text.trim().replaceAll(',', '.'));
    if (montant == null || montant <= 0) {
      ToastWidget.show(context, 'Veuillez saisir un montant valide.', type: 'erreur');
      return;
    }
    setState(() => _chargement = true);
    try {
      final carte = await ApiCartesCadeaux.acheter(
        montant: montant,
        devise: _devise,
        beneficiaireTelephone: _beneficiaireCtrl.text.trim(),
      );
      if (mounted) {
        ToastWidget.show(context, 'Carte cadeau ${carte['code']} achetée !', type: 'succes');
        context.go('/cartes-cadeaux');
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
      appBar: AppBar(title: const Text('Acheter une carte cadeau')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Offrez une carte cadeau utilisable pour toute réservation RESERVA.',
              style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 24),
            TextField(
              controller: _montantCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Montant',
                border: OutlineInputBorder(),
                hintText: 'Ex: 50',
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _devise,
              decoration: const InputDecoration(labelText: 'Devise', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'USD', child: Text('USD')),
                DropdownMenuItem(value: 'CDF', child: Text('CDF (Francs congolais)')),
              ],
              onChanged: (v) => setState(() => _devise = v ?? 'USD'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _beneficiaireCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Téléphone du bénéficiaire (optionnel)',
                border: OutlineInputBorder(),
                hintText: 'Ex: 0991234567',
              ),
            ),
            const SizedBox(height: 8),
            const Text('Si renseigné, la carte sera associée au compte du bénéficiaire.',
              style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _chargement ? null : _acheter,
                icon: const Icon(Icons.redeem),
                label: const Text('Acheter la carte'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppCouleurs.primaire,
                  foregroundColor: AppCouleurs.blanc,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            if (_chargement)
              const Padding(
                padding: EdgeInsets.only(top: 16),
                child: Center(child: CircularProgressIndicator()),
              ),
          ],
        ),
      ),
    );
  }
}
