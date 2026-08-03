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

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final data = await ApiAdmin.obtenirStatistiques();
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
      return Padding(
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
      );
    }).toList();
  }

  Widget _carteStat(IconData icon, String label, String valeur, String sousTitre, Color color) {
    return Carte(
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
    );
  }
}
