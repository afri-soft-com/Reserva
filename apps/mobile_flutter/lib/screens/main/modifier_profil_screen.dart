import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/toast.dart';

class ModifierProfilScreen extends StatefulWidget {
  const ModifierProfilScreen({super.key});

  @override
  State<ModifierProfilScreen> createState() => _ModifierProfilScreenState();
}

class _ModifierProfilScreenState extends State<ModifierProfilScreen> {
  late TextEditingController _nomCtrl;
  late TextEditingController _emailCtrl;
  late String _langue;
  bool _sauvegarde = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().utilisateur!;
    _nomCtrl = TextEditingController(text: user.nom);
    _emailCtrl = TextEditingController(text: user.email ?? '');
    _langue = user.langue;
  }

  @override
  void dispose() {
    _nomCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _sauvegarder() async {
    if (_nomCtrl.text.trim().length < 2) {
      ToastWidget.show(context, 'Le nom doit contenir au moins 2 caractères', type: 'erreur');
      return;
    }
    setState(() => _sauvegarde = true);
    try {
      await context.read<AuthProvider>().mettreAJourProfil(
        nom: _nomCtrl.text.trim(),
        email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
        langue: _langue,
      );
      if (mounted) {
        ToastWidget.show(context, 'Profil mis à jour');
        context.pop();
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, 'Erreur: ${e.toString().replaceAll("Exception: ", "")}', type: 'erreur');
    } finally {
      if (mounted) setState(() => _sauvegarde = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Modifier mon profil')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(color: AppCouleurs.primaireClair, shape: BoxShape.circle),
              child: const Icon(Icons.person, size: 40, color: AppCouleurs.primaire),
            ),
            const SizedBox(height: 24),
            const Text('Nom complet', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 6),
            TextField(
              controller: _nomCtrl,
              decoration: InputDecoration(
                hintText: 'Votre nom',
                filled: true, fillColor: AppCouleurs.blanc,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Email (optionnel)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 6),
            TextField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                hintText: 'email@exemple.com',
                filled: true, fillColor: AppCouleurs.blanc,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Langue', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 8),
            Row(
              children: [
                _langueChip('fr', 'Français'),
                const SizedBox(width: 8),
                _langueChip('ln', 'Lingála'),
                const SizedBox(width: 8),
                _langueChip('sw', 'Kiswahili'),
              ],
            ),
            const SizedBox(height: 32),
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

  Widget _langueChip(String code, String label) {
    final actif = _langue == code;
    return ChoiceChip(
      label: Text(label),
      selected: actif,
      selectedColor: AppCouleurs.primaire,
      backgroundColor: AppCouleurs.blanc,
      labelStyle: TextStyle(color: actif ? Colors.white : AppCouleurs.texte, fontSize: 13),
      onSelected: (_) => setState(() => _langue = code),
    );
  }
}
