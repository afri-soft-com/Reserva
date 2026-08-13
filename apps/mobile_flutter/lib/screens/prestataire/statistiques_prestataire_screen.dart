import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_prestataire.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';

class StatistiquesPrestataireScreen extends StatefulWidget {
  const StatistiquesPrestataireScreen({super.key});

  @override
  State<StatistiquesPrestataireScreen> createState() => _StatistiquesPrestataireScreenState();
}

class _StatistiquesPrestataireScreenState extends State<StatistiquesPrestataireScreen> {
  Map<String, dynamic>? _donnees;
  bool _chargement = true;
  bool _erreur = false;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final donnees = await ApiPrestataire.obtenirStatistiques();
      if (mounted) {
        setState(() {
          _donnees = donnees;
          _erreur = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _erreur = true);
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _formater(double montant, {String devise = 'CDF'}) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  String _libelleStatut(String statut) {
    switch (statut) {
      case 'EN_ATTENTE': return 'En attente';
      case 'CONFIRMEE': return 'Confirmées';
      case 'EN_COURS': return 'En cours';
      case 'REFUSEE': return 'Refusées';
      case 'ANNULEE': return 'Annulées';
      case 'TERMINEE': return 'Terminées';
      case 'ABSENCE': return 'Absences';
      default: return statut;
    }
  }

  Color _couleurStatut(String statut) {
    switch (statut) {
      case 'EN_ATTENTE': return AppCouleurs.avertissement;
      case 'CONFIRMEE': return AppCouleurs.succes;
      case 'EN_COURS': return AppCouleurs.primaire;
      case 'REFUSEE': return AppCouleurs.alerte;
      case 'ANNULEE': return AppCouleurs.texteSecondaire;
      case 'TERMINEE': return AppCouleurs.primaire;
      case 'ABSENCE': return AppCouleurs.alerte;
      default: return AppCouleurs.texteSecondaire;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: const Text('Statistiques'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _charger),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _charger,
        color: AppCouleurs.primaire,
        child: _chargement
            ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
            : _donnees == null
                ? Padding(
                    padding: const EdgeInsets.all(32),
                    child: _erreur
                        ? EcranVide(
                            icone: Icons.error_outline,
                            message: 'Impossible de charger les statistiques',
                            sousTitre: 'Vérifiez votre connexion puis réessayez.',
                            action: ElevatedButton.icon(
                              onPressed: _charger,
                              icon: const Icon(Icons.refresh, size: 18),
                              label: const Text('Réessayer'),
                              style: ElevatedButton.styleFrom(backgroundColor: AppCouleurs.primaire, foregroundColor: AppCouleurs.blanc),
                            ),
                          )
                        : const EcranVide(icone: Icons.bar_chart, message: 'Aucune donnée disponible'),
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildCartesSynthese(),
                      const SizedBox(height: 16),
                      _buildActiviteJournaliere(),
                      const SizedBox(height: 16),
                      _buildRepartitionStatuts(),
                      const SizedBox(height: 16),
                      _buildParService(),
                      const SizedBox(height: 16),
                      _buildDistributionNotes(),
                      const SizedBox(height: 16),
                      _buildTopClients(),
                    ],
                  ),
      ),
    );
  }

  Widget _buildCartesSynthese() {
    final note = (_donnees?['noteMoyenne'] as num?)?.toDouble() ?? 0.0;
    final avis = _donnees?['nombreAvis'] as int? ?? 0;
    final total = _donnees?['totalReservations'] as int? ?? 0;
    final taux = (_donnees?['tauxAnnulation'] as num?)?.toDouble() ?? 0.0;
    return Row(
      children: [
        Expanded(child: _statCard(Icons.event_available, 'Réservations', '$total', AppCouleurs.primaire)),
        const SizedBox(width: 8),
        Expanded(child: _statCard(Icons.cancel, 'Annulation', '${taux.toStringAsFixed(1)}%', AppCouleurs.alerte)),
        const SizedBox(width: 8),
        Expanded(child: _statCard(Icons.star, 'Note', note.toStringAsFixed(1), AppCouleurs.accent)),
        const SizedBox(width: 8),
        Expanded(child: _statCard(Icons.people, 'Avis', '$avis', AppCouleurs.succes)),
      ],
    );
  }

  Widget _statCard(IconData icon, String label, String value, Color color) {
    return Carte(
      padding: const EdgeInsets.all(10),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: color)),
          Text(label, style: const TextStyle(fontSize: 9, color: AppCouleurs.texteSecondaire)),
        ],
      ),
    );
  }

  Widget _buildActiviteJournaliere() {
    final parJour = (_donnees?['parJour'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
    if (parJour.isEmpty) return const SizedBox.shrink();
    final maxReservations = parJour.fold<int>(0, (m, j) => (j['reservations'] as int? ?? 0) > m ? (j['reservations'] as int? ?? 0) : m);
    return Carte(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Activité — 30 derniers jours', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: parJour.map((j) {
                final count = j['reservations'] as int? ?? 0;
                final hauteur = maxReservations > 0 ? (count / maxReservations) * 90 : 0.0;
                final date = j['date'] as String? ?? '';
                final jour = date.length >= 10 ? date.substring(8, 10) : date;
                return Padding(
                  padding: const EdgeInsets.only(right: 3),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(count > 0 ? '$count' : '', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 2),
                      Container(
                        width: 12, height: hauteur.clamp(2, 90).toDouble(),
                        decoration: BoxDecoration(
                          color: count > 0 ? AppCouleurs.primaire : AppCouleurs.fond,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(jour, style: const TextStyle(fontSize: 8, color: AppCouleurs.texteSecondaire)),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRepartitionStatuts() {
    final parStatut = (_donnees?['parStatut'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
    if (parStatut.isEmpty) return const SizedBox.shrink();
    final total = parStatut.fold<int>(0, (s, p) => s + (p['_count'] as int? ?? 0));
    return Carte(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Répartition par statut', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ...parStatut.map((s) {
            final statut = s['statut'] as String? ?? '';
            final count = s['_count'] as int? ?? 0;
            final ratio = total > 0 ? count / total : 0.0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(_libelleStatut(statut), style: const TextStyle(fontSize: 12)),
                      Text('$count (${(ratio * 100).toStringAsFixed(0)}%)', style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: ratio,
                      backgroundColor: AppCouleurs.fond,
                      color: _couleurStatut(statut),
                      minHeight: 6,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildParService() {
    final parService = (_donnees?['parService'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
    if (parService.isEmpty) return const SizedBox.shrink();
    final maxReservations = parService.fold<int>(0, (m, s) => (s['reservations'] as int? ?? 0) > m ? (s['reservations'] as int? ?? 0) : m);
    return Carte(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Réservations par service', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ...parService.map((s) {
            final count = s['reservations'] as int? ?? 0;
            final revenus = (s['revenus'] as num?)?.toDouble() ?? 0.0;
            final ratio = maxReservations > 0 ? count / maxReservations : 0.0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(s['nom'] as String? ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                      const SizedBox(width: 8),
                      Text('${_formater(revenus)} • $count rés.', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: ratio,
                      backgroundColor: AppCouleurs.fond,
                      color: AppCouleurs.succes,
                      minHeight: 6,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildDistributionNotes() {
    final repartition = (_donnees?['repartitionNotes'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
    if (repartition.isEmpty) return const SizedBox.shrink();
    final max = repartition.fold<int>(0, (m, n) => (n['nombre'] as int? ?? 0) > m ? (n['nombre'] as int? ?? 0) : m);
    return Carte(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Distribution des notes', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ...[5, 4, 3, 2, 1].map((note) {
            final nombre = repartition.firstWhere((n) => n['note'] == note, orElse: () => {'note': note, 'nombre': 0})['nombre'] as int? ?? 0;
            final ratio = max > 0 ? nombre / max : 0.0;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  Text('$note', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                  const SizedBox(width: 4),
                  const Icon(Icons.star, size: 12, color: AppCouleurs.accent),
                  const SizedBox(width: 4),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: ratio,
                        backgroundColor: AppCouleurs.fond,
                        color: AppCouleurs.accent,
                        minHeight: 8,
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text('$nombre', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildTopClients() {
    final clients = (_donnees?['topClients'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
    if (clients.isEmpty) return const SizedBox.shrink();
    return Carte(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Meilleurs clients', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ...clients.indexed.map((entry) {
            final index = entry.$1;
            final c = entry.$2;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Container(
                    width: 26, height: 26,
                    decoration: BoxDecoration(
                      color: AppCouleurs.primaireClair,
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Center(
                      child: Text('${index + 1}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppCouleurs.primaire)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c['nom'] as String? ?? 'Client', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        Text(c['telephone'] as String? ?? '', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('${c['reservations'] ?? 0} rés.', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                      Text(_formater((c['totalDepense'] as num?)?.toDouble() ?? 0.0),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppCouleurs.primaire)),
                    ],
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
