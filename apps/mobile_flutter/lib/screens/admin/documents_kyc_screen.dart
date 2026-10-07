import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_admin.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class DocumentsKycScreen extends StatefulWidget {
  const DocumentsKycScreen({super.key});

  @override
  State<DocumentsKycScreen> createState() => _DocumentsKycScreenState();
}

class _DocumentsKycScreenState extends State<DocumentsKycScreen> {
  bool _chargement = true;
  bool _envoi = false;
  bool _actif = false;
  int _delaiJours = 7;
  String? _activeLe;
  List<dynamic> _docsDispo = [];
  Map<String, List<String>> _parCategorie = {};
  String _categorie = 'SANTE';

  static const _categories = {
    'SANTE': 'Santé',
    'TRANSPORT': 'Transport',
    'HOTELLERIE': 'Hôtellerie',
    'RESTAURATION': 'Restauration',
    'SALLE_REUNION': 'Salle de réunion',
    'ADMINISTRATIF': 'Administratif',
    'EDUCATION': 'Éducation',
  };

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final data = await ApiAdmin.obtenirExigenceDocuments();
      final config = data['config'] as Map<String, dynamic>? ?? {};
      final docsMap = config['documents'] as Map<String, dynamic>? ?? {};
      setState(() {
        _actif = config['actif'] == true;
        _delaiJours = (config['delaiJours'] as num?)?.toInt() ?? 7;
        _activeLe = config['activeLe'] as String?;
        _docsDispo = data['documentsDisponibles'] as List? ?? [];
        _parCategorie = {
          for (final e in docsMap.entries)
            e.key: (e.value as List?)?.map((x) => x.toString()).toList() ?? <String>[],
        };
      });
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _sauver() async {
    setState(() => _envoi = true);
    try {
      await ApiAdmin.enregistrerExigenceDocuments({
        'actif': _actif,
        'delaiJours': _delaiJours,
        'documents': _parCategorie,
      });
      if (mounted) ToastWidget.show(context, 'Règle documentaire enregistrée', type: 'succes');
      await _charger();
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Padding(padding: EdgeInsets.all(16), child: Squelette());
    final selection = Set<String>.from(_parCategorie[_categorie] ?? []);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Cochez les documents obligatoires. Après le délai (depuis la sauvegarde), les prestataires non conformes ne sont plus visibles.',
          style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire),
        ),
        const SizedBox(height: 12),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Activer l\'exigence documentaire', style: TextStyle(fontWeight: FontWeight.w600)),
          subtitle: const Text('Notifications + blocage marketplace'),
          value: _actif,
          onChanged: (v) => setState(() => _actif = v),
        ),
        Row(
          children: [
            const Expanded(child: Text('Délai avant blocage (jours)', style: TextStyle(fontSize: 13))),
            IconButton(
              onPressed: () => setState(() => _delaiJours = (_delaiJours - 1).clamp(0, 365)),
              icon: const Icon(Icons.remove_circle_outline),
            ),
            Text('$_delaiJours', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            IconButton(
              onPressed: () => setState(() => _delaiJours = (_delaiJours + 1).clamp(0, 365)),
              icon: const Icon(Icons.add_circle_outline),
            ),
          ],
        ),
        if (_activeLe != null) ...[
          const SizedBox(height: 6),
          Text('Dernière activation : $_activeLe', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
        ],
        const SizedBox(height: 16),
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: _categories.entries.map((e) {
              final sel = _categorie == e.key;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text('${e.value} (${(_parCategorie[e.key] ?? []).length})'),
                  selected: sel,
                  onSelected: (_) => setState(() => _categorie = e.key),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 8),
        ..._docsDispo.map((d) {
          final id = d['id'] as String;
          final libelle = d['libelle'] as String? ?? id;
          return CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: Text(libelle, style: const TextStyle(fontSize: 14)),
            value: selection.contains(id),
            onChanged: (v) {
              setState(() {
                final liste = List<String>.from(_parCategorie[_categorie] ?? []);
                if (v == true) {
                  if (!liste.contains(id)) liste.add(id);
                } else {
                  liste.remove(id);
                }
                _parCategorie[_categorie] = liste;
              });
            },
          );
        }),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _envoi ? null : _sauver,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppCouleurs.primaire,
            foregroundColor: AppCouleurs.blanc,
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          child: _envoi
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Enregistrer la règle'),
        ),
      ],
    );
  }
}
