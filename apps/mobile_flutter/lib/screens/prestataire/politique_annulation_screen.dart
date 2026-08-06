import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_prestataire.dart';
import '../../widgets/carte.dart';
import '../../widgets/toast.dart';

class PolitiqueAnnulationScreen extends StatefulWidget {
  const PolitiqueAnnulationScreen({super.key});

  @override
  State<PolitiqueAnnulationScreen> createState() => _PolitiqueAnnulationScreenState();
}

class _PolitiqueAnnulationScreenState extends State<PolitiqueAnnulationScreen> {
  late TextEditingController _delaiCtrl;
  late TextEditingController _fraisCtrl;
  bool _chargement = true;
  bool _sauvegarde = false;

  @override
  void initState() {
    super.initState();
    _delaiCtrl = TextEditingController(text: '24');
    _fraisCtrl = TextEditingController(text: '50');
    _charger();
  }

  @override
  void dispose() {
    _delaiCtrl.dispose();
    _fraisCtrl.dispose();
    super.dispose();
  }

  Future<void> _charger() async {
    try {
      final profil = await ApiPrestataire.obtenirProfil();
      if (!mounted) return;
      _delaiCtrl.text = (profil['delaiAnnulationGratuiteHeures'] as num?)?.toInt().toString() ?? '24';
      _fraisCtrl.text = (profil['fraisAnnulationTardivePourcent'] as num?)?.toInt().toString() ?? '50';
    } catch (_) {
      // Valeurs par défaut conservées si le profil ne charge pas
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _sauvegarder() async {
    final delai = int.tryParse(_delaiCtrl.text.trim());
    final frais = int.tryParse(_fraisCtrl.text.trim());
    if (delai == null || delai < 0 || delai > 168) {
      ToastWidget.show(context, 'Le délai doit être entre 0 et 168 heures.', type: 'erreur');
      return;
    }
    if (frais == null || frais < 0 || frais > 100) {
      ToastWidget.show(context, 'Le pourcentage de frais doit être entre 0 et 100.', type: 'erreur');
      return;
    }
    setState(() => _sauvegarde = true);
    try {
      await ApiPrestataire.modifierProfilPrestataire({
        'delaiAnnulationGratuiteHeures': delai,
        'fraisAnnulationTardivePourcent': frais,
      });
      if (mounted) ToastWidget.show(context, 'Politique d\'annulation mise à jour', type: 'succes');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _sauvegarde = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Politique d\'annulation')),
      body: _chargement
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Carte(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Annulation gratuite jusqu\'à', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _delaiCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            hintText: 'Ex: 24',
                            suffixText: 'heures avant le créneau',
                            filled: true,
                            fillColor: AppCouleurs.blanc,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text('Tant que l\'annulation a lieu au moins N heures avant le créneau, elle est gratuite (0 à 168 h).',
                          style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                        const Divider(height: 28),
                        const Text('Frais d\'annulation tardive', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _fraisCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            hintText: 'Ex: 50',
                            suffixText: '% du montant',
                            filled: true,
                            fillColor: AppCouleurs.blanc,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text('Ce pourcentage est retenu sur le montant payé en cas d\'annulation après le délai (0 à 100 %).',
                          style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _sauvegarde ? null : _sauvegarder,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppCouleurs.primaire,
                        foregroundColor: AppCouleurs.blanc,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _sauvegarde
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Enregistrer'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
