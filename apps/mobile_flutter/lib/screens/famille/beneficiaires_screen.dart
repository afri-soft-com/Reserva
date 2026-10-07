import 'package:flutter/material.dart';
import '../../services/api_innovations.dart';
import '../../theme.dart';
import '../../widgets/toast.dart';

class BeneficiairesScreen extends StatefulWidget {
  const BeneficiairesScreen({super.key});

  @override
  State<BeneficiairesScreen> createState() => _BeneficiairesScreenState();
}

class _BeneficiairesScreenState extends State<BeneficiairesScreen> {
  List<dynamic> _items = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final items = await ApiInnovations.listerBeneficiaires();
      if (mounted) setState(() => _items = items);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _ajouter() async {
    final nomCtrl = TextEditingController();
    final telCtrl = TextEditingController();
    String lien = 'ENFANT';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Kit famille — ajouter'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nomCtrl, decoration: const InputDecoration(labelText: 'Nom')),
            TextField(controller: telCtrl, decoration: const InputDecoration(labelText: 'Téléphone'), keyboardType: TextInputType.phone),
            DropdownButtonFormField<String>(
              value: lien,
              items: const [
                DropdownMenuItem(value: 'ENFANT', child: Text('Enfant')),
                DropdownMenuItem(value: 'EPOUX', child: Text('Époux / Épouse')),
                DropdownMenuItem(value: 'PARENT', child: Text('Parent')),
                DropdownMenuItem(value: 'AMI', child: Text('Ami')),
                DropdownMenuItem(value: 'AUTRE', child: Text('Autre')),
              ],
              onChanged: (v) => lien = v ?? 'AUTRE',
              decoration: const InputDecoration(labelText: 'Lien'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Ajouter')),
        ],
      ),
    );
    if (ok != true || nomCtrl.text.trim().length < 2) return;
    try {
      await ApiInnovations.creerBeneficiaire(
        nom: nomCtrl.text.trim(),
        telephone: telCtrl.text.trim().isEmpty ? null : telCtrl.text.trim(),
        lienParente: lien,
      );
      await _charger();
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kit famille')),
      floatingActionButton: FloatingActionButton(
        onPressed: _ajouter,
        backgroundColor: AppCouleurs.primaire,
        child: const Icon(Icons.person_add),
      ),
      body: _chargement
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('Ajoutez les membres de votre foyer pour réserver pour eux.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final b = _items[i] as Map<String, dynamic>;
                    return ListTile(
                      leading: const CircleAvatar(child: Icon(Icons.family_restroom)),
                      title: Text(b['nom']?.toString() ?? ''),
                      subtitle: Text('${b['lienParente'] ?? ''} · ${b['telephone'] ?? 'sans tél.'}'),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () async {
                          await ApiInnovations.supprimerBeneficiaire(b['id'] as String);
                          _charger();
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
