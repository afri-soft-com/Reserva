import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_packages.dart';
import '../../services/api_prestataire.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class PackagesScreen extends StatefulWidget {
  const PackagesScreen({super.key});

  @override
  State<PackagesScreen> createState() => _PackagesScreenState();
}

class _PackagesScreenState extends State<PackagesScreen> {
  bool _chargement = true;
  List<dynamic> _packages = [];
  List<dynamic> _services = [];

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final results = await Future.wait([
        ApiPackages.mesPackages(),
        ApiPrestataire.listerMesServices(),
      ]);
      if (mounted) {
        setState(() {
          _packages = results[0];
          _services = results[1];
        });
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _formater(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  List<String> _servicesIdsDunPackage(Map<String, dynamic> pack) {
    final services = pack['services'] as List<dynamic>? ?? [];
    return services.map((s) {
      final m = s as Map<String, dynamic>;
      return m['serviceId'] as String? ?? (m['service'] is Map ? (m['service']['id'] as String? ?? '') : '');
    }).where((id) => id.isNotEmpty).toList();
  }

  String _nomsServicesDunPackage(Map<String, dynamic> pack) {
    final services = pack['services'] as List<dynamic>? ?? [];
    return services.map((s) {
      final m = s as Map<String, dynamic>;
      final svc = m['service'];
      if (svc is Map) return svc['nom'] as String? ?? '';
      return '';
    }).where((n) => n.isNotEmpty).join(', ');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Mes packages')),
      body: RefreshIndicator(
        onRefresh: _charger,
        color: AppCouleurs.primaire,
        child: _chargement
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Packages (${_packages.length})',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      TextButton.icon(
                        onPressed: _services.isEmpty
                            ? null
                            : () => _showEditerPackage(null),
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Créer', style: TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_packages.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 48),
                      child: EcranVide(
                        icone: Icons.inventory_2_outlined,
                        message: 'Aucun package',
                        sousTitre: 'Regroupez plusieurs services dans un forfait (ex: bilan santé complet).',
                      ),
                    )
                  else
                    ..._packages.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Carte(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(p['nom'] as String? ?? '',
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: (p['actif'] as bool? ?? false)
                                        ? AppCouleurs.succes.withValues(alpha: 0.1)
                                        : AppCouleurs.texteSecondaire.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    (p['actif'] as bool? ?? false) ? 'ACTIF' : 'INACTIF',
                                    style: TextStyle(
                                      fontSize: 10, fontWeight: FontWeight.w700,
                                      color: (p['actif'] as bool? ?? false) ? AppCouleurs.succes : AppCouleurs.texteSecondaire,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(_formater((p['prix'] as num?)?.toDouble() ?? 0, p['devise'] as String? ?? 'CDF'),
                              style: const TextStyle(fontWeight: FontWeight.w700, color: AppCouleurs.primaire, fontSize: 14)),
                            const SizedBox(height: 4),
                            if (_nomsServicesDunPackage(p).isNotEmpty)
                              Text(_nomsServicesDunPackage(p),
                                style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                            if (p['description'] != null && (p['description'] as String).isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(p['description'] as String,
                                style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire),
                                maxLines: 2, overflow: TextOverflow.ellipsis),
                            ],
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                TextButton.icon(
                                  onPressed: () => _showEditerPackage(p),
                                  icon: const Icon(Icons.edit, size: 16),
                                  label: const Text('Modifier', style: TextStyle(fontSize: 12)),
                                ),
                                if (p['actif'] as bool? ?? false) ...[
                                  const SizedBox(width: 4),
                                  TextButton.icon(
                                    onPressed: () => _desactiver(p),
                                    icon: const Icon(Icons.delete_outline, size: 16, color: AppCouleurs.alerte),
                                    label: const Text('Désactiver', style: TextStyle(fontSize: 12, color: AppCouleurs.alerte)),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    )),
                ],
              ),
      ),
    );
  }

  Future<void> _desactiver(Map<String, dynamic> pack) async {
    final confirmer = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Désactiver le package'),
        content: Text('Voulez-vous désactiver le package « ${pack['nom']} » ? Il ne sera plus visible par les clients.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Désactiver', style: TextStyle(color: AppCouleurs.alerte)),
          ),
        ],
      ),
    );
    if (confirmer != true || !mounted) return;
    try {
      await ApiPackages.supprimerPackage(pack['id'] as String);
      _charger();
      if (mounted) ToastWidget.show(context, 'Package désactivé', type: 'succes');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  void _showEditerPackage(Map<String, dynamic>? pack) {
    final nomCtrl = TextEditingController(text: pack?['nom'] as String? ?? '');
    final prixCtrl = TextEditingController(text: pack?['prix'] != null ? '${pack!['prix']}' : '');
    final descCtrl = TextEditingController(text: pack?['description'] as String? ?? '');
    String devise = pack?['devise'] as String? ?? 'CDF';
    final serviceIds = _servicesIdsDunPackage(pack ?? {}).toSet();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) {
        return AlertDialog(
          title: Text(pack == null ? 'Nouveau package' : 'Modifier le package'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nomCtrl, decoration: const InputDecoration(labelText: 'Nom', hintText: 'Ex: Bilan santé complet')),
                const SizedBox(height: 8),
                TextField(controller: prixCtrl, decoration: const InputDecoration(labelText: 'Prix'), keyboardType: TextInputType.number),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: devise, decoration: const InputDecoration(labelText: 'Devise'),
                  items: const [
                    DropdownMenuItem(value: 'CDF', child: Text('CDF')),
                    DropdownMenuItem(value: 'USD', child: Text('USD')),
                  ],
                  onChanged: (v) => setDialogState(() => devise = v!),
                ),
                const SizedBox(height: 8),
                TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 3),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Services inclus (${serviceIds.length})',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(height: 4),
                ..._services.map((s) => CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text('${s['nom']} — ${_formater((s['prix'] as num?)?.toDouble() ?? 0, s['devise'] as String? ?? 'CDF')}',
                    style: const TextStyle(fontSize: 13)),
                  value: serviceIds.contains(s['id']),
                  onChanged: (v) => setDialogState(() {
                    if (v == true) {
                      serviceIds.add(s['id'] as String);
                    } else {
                      serviceIds.remove(s['id'] as String);
                    }
                  }),
                )),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () async {
                if (nomCtrl.text.isEmpty || prixCtrl.text.isEmpty || serviceIds.isEmpty) {
                  if (ctx.mounted) ToastWidget.show(ctx, 'Nom, prix et au moins un service requis.', type: 'erreur');
                  return;
                }
                try {
                  final body = {
                    'nom': nomCtrl.text,
                    'prix': double.parse(prixCtrl.text.replaceAll(',', '.')),
                    'devise': devise,
                    if (descCtrl.text.isNotEmpty) 'description': descCtrl.text,
                    'serviceIds': serviceIds.toList(),
                  };
                  if (pack == null) {
                    await ApiPackages.creerPackage(
                      nom: body['nom'] as String,
                      prix: body['prix'] as double,
                      devise: body['devise'] as String,
                      description: body['description'] as String?,
                      serviceIds: body['serviceIds'] as List<String>,
                    );
                  } else {
                    await ApiPackages.modifierPackage(pack['id'] as String, body);
                  }
                  if (ctx.mounted) Navigator.pop(ctx);
                  _charger();
                  if (mounted) ToastWidget.show(context, pack == null ? 'Package créé' : 'Package modifié', type: 'succes');
                } catch (e) {
                  if (ctx.mounted) ToastWidget.show(ctx, e.toString(), type: 'erreur');
                }
              },
              child: const Text('Enregistrer'),
            ),
          ],
        );
      }),
    );
  }
}
