import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_ressources.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

/// Gestion des tables d'un service en mode TABLE (restaurant).
class TablesPrestataireScreen extends StatefulWidget {
  final String serviceId;
  final String serviceNom;

  const TablesPrestataireScreen({super.key, required this.serviceId, required this.serviceNom});

  @override
  State<TablesPrestataireScreen> createState() => _TablesPrestataireScreenState();
}

class _TablesPrestataireScreenState extends State<TablesPrestataireScreen> {
  List<dynamic> _tables = [];
  bool _chargement = true;
  String? _erreur;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    try {
      final tables = await ApiRessources.lister(widget.serviceId);
      if (mounted) setState(() { _tables = tables; _erreur = null; });
    } catch (e) {
      if (mounted) setState(() => _erreur = e.toString());
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  List<dynamic> get _actives => _tables.where((t) => t['actif'] == true).toList();

  int get _couvertsTotal => _actives.fold<int>(0, (s, t) => s + ((t['capacite'] as num?)?.toInt() ?? 0));

  Future<void> _executer(Future<void> Function() action, String succes) async {
    try {
      await action();
      if (mounted) ToastWidget.show(context, succes, type: 'succes');
      await _charger();
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    }
  }

  /// Saisie commune « nom + capacité » (ajout / modification d'une table).
  Future<({String nom, int capacite})?> _saisirTable({String? nom, int? capacite, required String titre}) {
    final nomCtrl = TextEditingController(text: nom ?? '');
    final capCtrl = TextEditingController(text: '${capacite ?? 4}');
    return showDialog<({String nom, int capacite})>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(titre),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nomCtrl,
              decoration: const InputDecoration(labelText: 'Nom', hintText: 'Ex : Table 12, Terrasse 3'),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: capCtrl,
              decoration: const InputDecoration(labelText: 'Nombre de places', suffixText: 'pers.'),
              keyboardType: TextInputType.number,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () {
              final cap = int.tryParse(capCtrl.text.trim());
              if (nomCtrl.text.trim().isEmpty || cap == null || cap < 1 || cap > 50) {
                ToastWidget.show(ctx, 'Indiquez un nom et entre 1 et 50 places', type: 'erreur');
                return;
              }
              Navigator.pop(ctx, (nom: nomCtrl.text.trim(), capacite: cap));
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }

  Future<void> _ajouterUne() async {
    final saisie = await _saisirTable(titre: 'Nouvelle table');
    if (saisie == null) return;
    await _executer(
      () => ApiRessources.creer(serviceId: widget.serviceId, nom: saisie.nom, capacite: saisie.capacite),
      'Table ajoutée',
    );
  }

  Future<void> _ajouterPlusieurs() async {
    final nombreCtrl = TextEditingController(text: '5');
    final capCtrl = TextEditingController(text: '4');
    final prefixeCtrl = TextEditingController(text: 'Table');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ajouter plusieurs tables'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nombreCtrl, decoration: const InputDecoration(labelText: 'Nombre de tables'), keyboardType: TextInputType.number),
            const SizedBox(height: 8),
            TextField(controller: capCtrl, decoration: const InputDecoration(labelText: 'Places par table', suffixText: 'pers.'), keyboardType: TextInputType.number),
            const SizedBox(height: 8),
            TextField(controller: prefixeCtrl, decoration: const InputDecoration(labelText: 'Nom', helperText: 'Numérotées à la suite : Table 1, Table 2…')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Ajouter')),
        ],
      ),
    );
    if (ok != true) return;
    final nombre = int.tryParse(nombreCtrl.text.trim());
    final cap = int.tryParse(capCtrl.text.trim());
    if (nombre == null || nombre < 1 || nombre > 100 || cap == null || cap < 1 || cap > 50) {
      if (mounted) ToastWidget.show(context, 'Entre 1 et 100 tables, de 1 à 50 places', type: 'erreur');
      return;
    }
    await _executer(
      () => ApiRessources.creerEnLot(serviceId: widget.serviceId, nombre: nombre, capacite: cap, prefixe: prefixeCtrl.text),
      '$nombre table(s) ajoutée(s)',
    );
  }

  Future<void> _modifier(Map<String, dynamic> table) async {
    final saisie = await _saisirTable(
      titre: 'Modifier la table',
      nom: table['nom'] as String?,
      capacite: (table['capacite'] as num?)?.toInt(),
    );
    if (saisie == null) return;
    await _executer(
      () => ApiRessources.modifier(table['id'] as String, {'nom': saisie.nom, 'capacite': saisie.capacite}),
      'Table modifiée',
    );
  }

  Future<void> _basculer(Map<String, dynamic> table) async {
    final active = table['actif'] == true;
    if (active) {
      await _executer(() => ApiRessources.retirer(table['id'] as String), 'Table retirée du service');
    } else {
      await _executer(() => ApiRessources.modifier(table['id'] as String, {'actif': true}), 'Table remise en service');
    }
  }

  void _ouvrirAjout() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.table_restaurant),
              title: const Text('Une table'),
              onTap: () { Navigator.pop(ctx); _ajouterUne(); },
            ),
            ListTile(
              leading: const Icon(Icons.grid_view),
              title: const Text('Plusieurs tables identiques'),
              onTap: () { Navigator.pop(ctx); _ajouterPlusieurs(); },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Tables · ${widget.serviceNom}')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _ouvrirAjout,
        icon: const Icon(Icons.add),
        label: const Text('Ajouter'),
      ),
      body: RefreshIndicator(
        onRefresh: _charger,
        child: _chargement
            ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                children: [
                  Text(
                    'Chaque réservation reçoit automatiquement la plus petite table libre adaptée au nombre de personnes.',
                    style: TextStyle(color: AppCouleurs.texteSecondaire, fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  if (_erreur != null && _tables.isEmpty)
                    EcranVide(
                      icone: Icons.error_outline,
                      message: 'Impossible de charger les tables',
                      sousTitre: _erreur!.replaceFirst('Exception: ', ''),
                      action: ElevatedButton(onPressed: _charger, child: const Text('Réessayer')),
                    )
                  else if (_tables.isEmpty)
                    const EcranVide(
                      icone: Icons.table_restaurant,
                      message: 'Aucune table',
                      sousTitre: 'Ajoutez vos tables avant de publier des créneaux.',
                    )
                  else ...[
                    Carte(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _stat('${_actives.length}', 'tables actives'),
                          _stat('$_couvertsTotal', 'couverts'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    ..._tables.map((t) => _ligneTable(t as Map<String, dynamic>)),
                  ],
                ],
              ),
      ),
    );
  }

  Widget _stat(String valeur, String libelle) => Column(
        children: [
          Text(valeur, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          Text(libelle, style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
        ],
      );

  Widget _ligneTable(Map<String, dynamic> t) {
    final active = t['actif'] == true;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Opacity(
        opacity: active ? 1 : 0.5,
        child: Carte(
          child: Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: AppCouleurs.primaire.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.table_restaurant, color: AppCouleurs.primaire, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t['nom'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    Text(
                      '${t['capacite']} place(s)${active ? '' : ' · hors service'}',
                      style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire),
                    ),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                onSelected: (v) {
                  if (v == 'modifier') _modifier(t);
                  if (v == 'basculer') _basculer(t);
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(value: 'modifier', child: Text('Modifier')),
                  PopupMenuItem(value: 'basculer', child: Text(active ? 'Retirer du service' : 'Remettre en service')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
