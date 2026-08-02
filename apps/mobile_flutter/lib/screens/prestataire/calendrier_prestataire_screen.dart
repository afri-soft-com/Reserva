import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_prestataire.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class CalendrierPrestataireScreen extends StatefulWidget {
  const CalendrierPrestataireScreen({super.key});

  @override
  State<CalendrierPrestataireScreen> createState() => _CalendrierPrestataireScreenState();
}

class _CalendrierPrestataireScreenState extends State<CalendrierPrestataireScreen> {
  DateTime _moisCourant = DateTime(DateTime.now().year, DateTime.now().month);
  Map<String, dynamic>? _donnees;
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  String get _cleMois =>
      '${_moisCourant.year}-${_moisCourant.month.toString().padLeft(2, '0')}';

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final donnees = await ApiPrestataire.obtenirCalendrier(mois: _cleMois);
      if (mounted) setState(() => _donnees = donnees);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  void _changerMois(int delta) {
    setState(() => _moisCourant = DateTime(_moisCourant.year, _moisCourant.month + delta));
    _charger();
  }

  List<DateTime> get _joursDuMois {
    final nbJours = DateTime(_moisCourant.year, _moisCourant.month + 1, 0).day;
    return List.generate(nbJours, (i) => DateTime(_moisCourant.year, _moisCourant.month, i + 1));
  }

  String _cleJour(DateTime jour) =>
      '${jour.year}-${jour.month.toString().padLeft(2, '0')}-${jour.day.toString().padLeft(2, '0')}';

  String _libelleJour(DateTime jour) {
    const jours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return jours[jour.weekday - 1];
  }

  String _couleurStatut(String statut) {
    switch (statut) {
      case 'EN_ATTENTE': return 'avertissement';
      case 'CONFIRMEE': return 'succes';
      case 'EN_COURS': return 'primaire';
      case 'REFUSEE': return 'alerte';
      case 'ANNULEE': return 'texteSecondaire';
      case 'TERMINEE': return 'primaire';
      default: return 'texteSecondaire';
    }
  }

  Color _colorStatut(String statut) {
    final key = _couleurStatut(statut);
    return key == 'succes' ? AppCouleurs.succes
        : key == 'avertissement' ? AppCouleurs.avertissement
        : key == 'alerte' ? AppCouleurs.alerte
        : key == 'primaire' ? AppCouleurs.primaire
        : AppCouleurs.texteSecondaire;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Calendrier')),
      body: _chargement
        ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
        : RefreshIndicator(
            onRefresh: _charger,
            color: AppCouleurs.primaire,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chevron_left),
                      onPressed: () => _changerMois(-1),
                    ),
                    Expanded(
                      child: Text(
                        '${_libelleMois(_moisCourant.month)} ${_moisCourant.year}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.chevron_right),
                      onPressed: () => _changerMois(1),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _buildTotaux(),
                const SizedBox(height: 16),
                ..._joursDuMois.map((jour) {
                  final cle = _cleJour(jour);
                  final creneauxJour = (_donnees?['jours'] as Map<String, dynamic>?)?[cle] as List<dynamic>? ?? [];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Carte(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 40, height: 40,
                                decoration: BoxDecoration(
                                  color: AppCouleurs.primaireClair,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                alignment: Alignment.center,
                                child: Text('${jour.day}',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(_libelleJour(jour),
                                      style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                                    Text(creneauxJour.isEmpty
                                        ? 'Aucun créneau'
                                        : '${creneauxJour.length} créneau(x)',
                                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          if (creneauxJour.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            ...creneauxJour.map((c) {
                              final creneau = c as Map<String, dynamic>;
                              final service = creneau['service'] as Map<String, dynamic>? ?? {};
                              final reservations = creneau['reservations'] as List<dynamic>? ?? [];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppCouleurs.fond,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          const Icon(Icons.access_time, size: 14, color: AppCouleurs.primaire),
                                          const SizedBox(width: 4),
                                          Text('${creneau['debut'].substring(11, 16)} - ${creneau['fin'].substring(11, 16)}',
                                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                          const Spacer(),
                                          Text('${creneau['capaciteReservee']}/${creneau['capaciteTotale']} places',
                                            style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(service['nom'] as String? ?? '',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                      if (reservations.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        ...reservations.map((r) {
                                          final resa = r as Map<String, dynamic>;
                                          final client = resa['client'] as Map<String, dynamic>? ?? {};
                                          return Padding(
                                            padding: const EdgeInsets.only(top: 2),
                                            child: Row(
                                              children: [
                                                Container(
                                                  width: 8, height: 8,
                                                  decoration: BoxDecoration(
                                                    color: _colorStatut(resa['statut'] as String? ?? ''),
                                                    shape: BoxShape.circle,
                                                  ),
                                                ),
                                                const SizedBox(width: 6),
                                                Expanded(
                                                  child: Text('${resa['numero']} — ${client['nom'] ?? ''}',
                                                    maxLines: 1, overflow: TextOverflow.ellipsis,
                                                    style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                                                ),
                                              ],
                                            ),
                                          );
                                        }),
                                      ],
                                    ],
                                  ),
                                ),
                              );
                            }),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
    );
  }

  Widget _buildTotaux() {
    final totalCreneaux = _donnees?['totalCreneaux'] as int? ?? 0;
    final totalReservations = _donnees?['totalReservations'] as int? ?? 0;
    return Row(
      children: [
        Expanded(child: _statCard(Icons.event, '$totalCreneaux', 'Créneaux', AppCouleurs.primaire)),
        const SizedBox(width: 8),
        Expanded(child: _statCard(Icons.book_online, '$totalReservations', 'Réservations', AppCouleurs.succes)),
      ],
    );
  }

  Widget _statCard(IconData icon, String value, String label, Color color) {
    return Carte(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
              Text(label, style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
            ],
          ),
        ],
      ),
    );
  }

  String _libelleMois(int mois) {
    const moisNom = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return moisNom[mois - 1];
  }
}
