import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../../theme.dart';
import '../../services/api_admin.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({super.key});

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  Map<String, dynamic>? _stats;
  bool _chargement = true;
  String _periode = 'mois';
  String _ville = '';
  String _categorie = '';
  final List<String> _villes = ['Kinshasa', 'Lubumbashi'];
  final List<String> _categories = ['HOTELLERIE', 'RESTAURATION', 'SANTE', 'TRANSPORT'];

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final data = await ApiAdmin.obtenirStatistiques(periode: _periode, ville: _ville, categorie: _categorie);
      if (mounted) setState(() => _stats = data);
    } catch (_) {
      if (mounted) setState(() => _stats = {});
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Padding(padding: EdgeInsets.all(16), child: Squelette());
    if (_stats == null) return const Center(child: Text('Erreur de chargement'));

    final u = _stats!['utilisateurs'] as Map<String, dynamic>? ?? {};
    final p = _stats!['prestataires'] as Map<String, dynamic>? ?? {};
    final r = _stats!['reservations'] as Map<String, dynamic>? ?? {};
    final rev = _stats!['revenus'] as Map<String, dynamic>? ?? {};

    return RefreshIndicator(
      onRefresh: _charger,
      color: AppCouleurs.primaire,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Plateforme', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              PopupMenuButton<String>(
                icon: const Icon(Icons.ios_share, size: 20),
                tooltip: 'Exporter',
                onSelected: _exporter,
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'reservations', child: Text('Exporter réservations (CSV)')),
                  PopupMenuItem(value: 'prestataires', child: Text('Exporter prestataires (CSV)')),
                  PopupMenuItem(value: 'utilisateurs', child: Text('Exporter utilisateurs (CSV)')),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _filtreDropdown('Période', _periode, ['mois', 'semaine', 'trimestre', 'annee', 'tout'], {
                'mois': 'Ce mois', 'semaine': 'Cette semaine', 'trimestre': '90 jours', 'annee': 'Cette année', 'tout': 'Toute la période',
              }, (v) {
                setState(() => _periode = v);
                _charger();
              })),
              const SizedBox(width: 8),
              Expanded(child: _filtreDropdown('Ville', _ville, ['', ..._villes], {
                '': 'Toutes', 'Kinshasa': 'Kinshasa', 'Lubumbashi': 'Lubumbashi',
              }, (v) {
                setState(() => _ville = v);
                _charger();
              })),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _filtreDropdown('Catégorie', _categorie, ['', ..._categories], {
                '': 'Toutes', 'HOTELLERIE': 'Hôtellerie', 'RESTAURATION': 'Restauration', 'SANTE': 'Santé', 'TRANSPORT': 'Transport',
              }, (v) {
                setState(() => _categorie = v);
                _charger();
              })),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  child: Text(
                    _libellePeriode(_periode),
                    style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _carteStat(Icons.people, 'Utilisateurs', '${u['total'] ?? 0}', '${u['nouveauxCeMois'] ?? 0} ce mois', AppCouleurs.primaire)),
              const SizedBox(width: 8),
              Expanded(child: _carteStat(Icons.business, 'Prestataires', '${p['total'] ?? 0}', '${p['approuves'] ?? 0} approuvés', AppCouleurs.succes)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _carteStat(Icons.calendar_month, 'Réservations', '${r['total'] ?? 0}', '${r['ceMois'] ?? 0} ce mois', AppCouleurs.accent)),
              const SizedBox(width: 8),
              Expanded(child: _carteStat(Icons.monetization_on, 'Revenus mois', '${rev['ceMois'] ?? 0} FC', '', AppCouleurs.alerte)),
            ],
          ),
          const SizedBox(height: 16),
          const Text('En attente', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: (p['enAttente'] as int? ?? 0) > 0 ? const Color(0xFFFEF3C7) : AppCouleurs.succes.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(
                  (p['enAttente'] as int? ?? 0) > 0 ? Icons.hourglass_empty : Icons.check_circle,
                  color: (p['enAttente'] as int? ?? 0) > 0 ? AppCouleurs.avertissement : AppCouleurs.succes,
                  size: 32,
                ),
                const SizedBox(width: 12),
                Text('${p['enAttente'] ?? 0} prestataire(s) en attente de validation',
                  style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w600,
                    color: (p['enAttente'] as int? ?? 0) > 0 ? AppCouleurs.avertissement : AppCouleurs.succes,
                  )),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text('Répartition des statuts', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ..._buildRepartitionStatuts(r['parStatut'] as Map<String, dynamic>? ?? {}),
        ],
      ),
    );
  }

  Future<void> _exporter(String type) async {
    try {
      final csv = await ApiAdmin.telechargerExportCsv(type);
      if (!mounted) return;
      await Share.share(csv, subject: 'Export RESERVA - $type');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  List<Widget> _buildRepartitionStatuts(Map<String, dynamic> parStatut) {
    if (parStatut.isEmpty) return [const Text('Aucune donnée', style: TextStyle(color: AppCouleurs.texteSecondaire))];
    final total = parStatut.values.fold<int>(0, (a, b) => a + (b as int? ?? 0));
    return parStatut.entries.map((e) {
      final count = e.value as int? ?? 0;
      final pct = total > 0 ? count / total : 0.0;
      return InkWell(
        onTap: () => ToastWidget.show(context, '${e.key} : $count (${(pct * 100).toStringAsFixed(0)}%)', type: 'info'),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              SizedBox(width: 100, child: Text(e.key, style: const TextStyle(fontSize: 12))),
              const SizedBox(width: 8),
              Expanded(child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(value: pct, backgroundColor: AppCouleurs.fond, color: AppCouleurs.primaire, minHeight: 10),
              )),
              const SizedBox(width: 8),
              SizedBox(width: 40, child: Text('$count', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
            ],
          ),
        ),
      );
    }).toList();
  }

  Widget _carteStat(IconData icon, String label, String valeur, String sousTitre, Color color, {VoidCallback? onTap}) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap ?? () {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: Text(label),
              content: Text('$valeur\n${sousTitre.isEmpty ? 'Touchez les filtres pour affiner.' : sousTitre}'),
              actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
            ),
          );
        },
        borderRadius: BorderRadius.circular(AppRayons.carte),
        child: Carte(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 6),
              Text(valeur, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
              Text(label, style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
              if (sousTitre.isNotEmpty)
                Text(sousTitre, style: const TextStyle(fontSize: 10, color: AppCouleurs.texteSecondaire)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _filtreDropdown(String label, String valeur, List<String> options, Map<String, String> libelles, ValueChanged<String> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCouleurs.texteSecondaire)),
        const SizedBox(height: 4),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: AppCouleurs.primaireClair),
            borderRadius: BorderRadius.circular(10),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: options.contains(valeur) ? valeur : options.first,
              isExpanded: true,
              icon: const Icon(Icons.arrow_drop_down, color: AppCouleurs.primaire),
              items: options.map((o) => DropdownMenuItem(value: o, child: Text(libelles[o] ?? o, style: const TextStyle(fontSize: 13)))).toList(),
              onChanged: (v) {
                if (v != null) onChanged(v);
              },
            ),
          ),
        ),
      ],
    );
  }

  String _libellePeriode(String periode) {
    return periode == 'mois' ? 'Affichage : ce mois-ci'
      : periode == 'semaine' ? 'Affichage : cette semaine'
      : periode == 'trimestre' ? 'Affichage : 90 derniers jours'
      : periode == 'annee' ? 'Affichage : cette année'
      : 'Affichage : toute la période';
  }
}
