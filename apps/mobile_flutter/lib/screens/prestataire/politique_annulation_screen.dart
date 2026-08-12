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
  String? _erreur;

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
    setState(() {
      _chargement = true;
      _erreur = null;
    });
    try {
      final profil = await ApiPrestataire.obtenirProfil();
      if (!mounted) return;
      _delaiCtrl.text = (profil['delaiAnnulationGratuiteHeures'] as num?)?.toInt().toString() ?? '24';
      _fraisCtrl.text = (profil['fraisAnnulationTardivePourcent'] as num?)?.toInt().toString() ?? '50';
    } catch (_) {
      if (mounted) setState(() => _erreur = 'Impossible de charger la politique d\'annulation actuelle.');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _sauvegarder() async {
    if (_erreur != null) return;
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
          : _erreur != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppCouleurs.alerte),
                        const SizedBox(height: 12),
                        Text(_erreur!, textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _charger,
                          icon: const Icon(Icons.refresh, size: 18),
                          label: const Text('Réessayer'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppCouleurs.primaire,
                            foregroundColor: AppCouleurs.blanc,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
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
