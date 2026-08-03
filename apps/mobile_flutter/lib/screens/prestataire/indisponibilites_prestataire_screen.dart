import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_prestataire.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class IndisponibilitesPrestataireScreen extends StatefulWidget {
  const IndisponibilitesPrestataireScreen({super.key});

  @override
  State<IndisponibilitesPrestataireScreen> createState() => _IndisponibilitesPrestataireScreenState();
}

class _IndisponibilitesPrestataireScreenState extends State<IndisponibilitesPrestataireScreen> {
  List<dynamic> _periodes = [];
  List<dynamic> _services = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final results = await Future.wait([
        ApiPrestataire.listerPeriodesIndisponibles(),
        ApiPrestataire.listerMesServices(),
      ]);
      if (mounted) {
        setState(() {
          _periodes = results[0];
          _services = results[1];
        });
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _formaterPeriode(Map<String, dynamic> p) {
    final debut = DateTime.parse(p['dateDebut'] as String);
    final fin = DateTime.parse(p['dateFin'] as String);
    final memesJours = fin.difference(debut).inDays <= 1;
    if (memesJours) {
      return 'Journée du ${_formatDate(debut)}';
    }
    return 'Du ${_formatDate(debut)} au ${_formatDate(fin)}';
  }

  String _formatDate(DateTime d) {
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  Future<void> _supprimer(String id) async {
    try {
      await ApiPrestataire.supprimerPeriodeIndisponible(id);
      if (mounted) ToastWidget.show(context, 'Blocage levé', type: 'succes');
      await _charger();
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  Future<void> _ouvrirAjout() async {
    String? serviceId;
    DateTime? debut;
    DateTime? fin;
    final motifCtrl = TextEditingController();

    final confirme = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) {
        return AlertDialog(
          title: const Text('Bloquer une période'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: serviceId,
                  decoration: const InputDecoration(labelText: 'Service concerné'),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('Tous les services')),
                    ..._services.map((s) => DropdownMenuItem(
                      value: s['id'] as String,
                      child: Text(s['nom'] as String? ?? ''),
                    )),
                  ],
                  onChanged: (v) => setDialogState(() => serviceId = v),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          final d = await showDatePicker(
                            context: ctx,
                            initialDate: debut ?? DateTime.now(),
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now().add(const Duration(days: 730)),
                          );
                          if (d != null) setDialogState(() => debut = d);
                        },
                        child: Text(debut == null
                            ? 'Date de début'
                            : 'Début : ${_formatDate(debut!)}'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          final d = await showDatePicker(
                            context: ctx,
                            initialDate: fin ?? (debut ?? DateTime.now()).add(const Duration(days: 1)),
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now().add(const Duration(days: 730)),
                          );
                          if (d != null) setDialogState(() => fin = d);
                        },
                        child: Text(fin == null
                            ? 'Date de fin'
                            : 'Fin : ${_formatDate(fin!)}'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: motifCtrl,
                  decoration: const InputDecoration(labelText: 'Motif (optionnel)', hintText: 'Ex : congés, maintenance...'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Confirmer'),
            ),
          ],
        );
      }),
    );

    if (confirme != true) return;
    if (debut == null || fin == null) {
      if (mounted) ToastWidget.show(context, 'Choisissez les dates de début et de fin', type: 'erreur');
      return;
    }
    if (fin!.isBefore(debut!)) {
      if (mounted) ToastWidget.show(context, 'La date de fin doit être postérieure à la date de début', type: 'erreur');
      return;
    }

    final dateDebut = DateTime(debut!.year, debut!.month, debut!.day);
    final dateFin = DateTime(fin!.year, fin!.month, fin!.day).add(const Duration(days: 1));

    try {
      await ApiPrestataire.creerPeriodeIndisponible({
        if (serviceId != null) 'serviceId': serviceId,
        'dateDebut': dateDebut.toUtc().toIso8601String(),
        'dateFin': dateFin.toUtc().toIso8601String(),
        if (motifCtrl.text.trim().isNotEmpty) 'motif': motifCtrl.text.trim(),
      });
      if (mounted) ToastWidget.show(context, 'Période bloquée', type: 'succes');
      await _charger();
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Jours bloqués')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppCouleurs.primaire,
        foregroundColor: AppCouleurs.blanc,
        onPressed: _ouvrirAjout,
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: _charger,
        color: AppCouleurs.primaire,
        child: _chargement
            ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'Bloquez des dates où vous ne pouvez pas recevoir de réservations.',
                    style: TextStyle(color: AppCouleurs.texteSecondaire, fontSize: 13),
                  ),
                  const SizedBox(height: 16),
                  if (_periodes.isEmpty)
                    Carte(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        child: Column(
                          children: [
                            Icon(Icons.event_busy, size: 48, color: AppCouleurs.texteSecondaire),
                            const SizedBox(height: 12),
                            const Text('Aucune période bloquée',
                              style: TextStyle(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            const Text('Appuyez sur + pour bloquer une période.',
                              style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                          ],
                        ),
                      ),
                    )
                  else
                    ..._periodes.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Carte(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 40, height: 40,
                              decoration: BoxDecoration(
                                color: AppCouleurs.alerte.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.event_busy, color: AppCouleurs.alerte, size: 22),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(_formaterPeriode(p),
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                  const SizedBox(height: 2),
                                  Text(
                                    (p['service'] as Map<String, dynamic>?)?['nom'] as String? ?? 'Tous les services',
                                    style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire),
                                  ),
                                  if ((p['motif'] as String?)?.isNotEmpty ?? false) ...[
                                    const SizedBox(height: 2),
                                    Text('Motif : ${p['motif']}',
                                      style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                                  ],
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () => _supprimer(p['id'] as String),
                              icon: const Icon(Icons.delete_outline, color: AppCouleurs.alerte),
                              tooltip: 'Lever le blocage',
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
}
