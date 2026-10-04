import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../services/api_hotels.dart';
import '../../widgets/toast.dart';

class HotelDetailScreen extends StatefulWidget {
  final String hotelId;
  final String arrivee;
  final String depart;
  final int adultes;
  final int enfants;

  const HotelDetailScreen({
    super.key,
    required this.hotelId,
    required this.arrivee,
    required this.depart,
    required this.adultes,
    required this.enfants,
  });

  @override
  State<HotelDetailScreen> createState() => _HotelDetailScreenState();
}

class _HotelDetailScreenState extends State<HotelDetailScreen> {
  Map<String, dynamic>? _hotel;
  bool _chargement = true;
  bool _hold = false;
  int _quantite = 1;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    try {
      final d = await ApiHotels.detail(
        hotelId: widget.hotelId,
        arrivee: widget.arrivee,
        depart: widget.depart,
        adultes: widget.adultes,
        enfants: widget.enfants,
      );
      if (mounted) setState(() => _hotel = d);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _prix(dynamic montant, dynamic devise) {
    final m = (montant as num?)?.toDouble() ?? 0;
    return devise == 'USD' ? '\$${m.toStringAsFixed(0)}' : '${m.toStringAsFixed(0)} FC';
  }

  Future<void> _reserver(Map<String, dynamic> chambre, Map<String, dynamic> tarif) async {
    setState(() => _hold = true);
    try {
      final sejour = await ApiHotels.creerHold({
        'hotelId': widget.hotelId,
        'typeChambreId': chambre['id'],
        'planTarifId': tarif['id'],
        'arrivee': widget.arrivee,
        'depart': widget.depart,
        'adultes': widget.adultes,
        'enfants': widget.enfants,
        'quantite': _quantite,
      });
      if (!mounted) return;
      context.push('/hotels/checkout/${sejour['id']}');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    } finally {
      if (mounted) setState(() => _hold = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final h = _hotel;
    if (h == null) return const Scaffold(body: Center(child: Text('Hôtel introuvable')));
    final chambres = (h['chambres'] as List?) ?? [];
    final avis = (h['avis'] as List?) ?? [];
    final photos = (h['photos'] as List?) ?? [];

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: Text('${h['nom']}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (photos.isNotEmpty)
            SizedBox(
              height: 160,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: photos.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) => ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network('${photos[i]}', width: 240, height: 160, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(width: 240, color: AppCouleurs.primaireClair)),
                ),
              ),
            ),
          const SizedBox(height: 12),
          Text('${h['ville']}, ${h['quartier']}', style: const TextStyle(color: AppCouleurs.texteSecondaire)),
          Text('${h['description'] ?? ''}', style: const TextStyle(fontSize: 14)),
          const SizedBox(height: 8),
          Text('Note ${(h['noteMoyenne'] as num?)?.toStringAsFixed(1)} · Propreté ${(h['noteProprete'] as num?)?.toStringAsFixed(1)} · Emplacement ${(h['noteEmplacement'] as num?)?.toStringAsFixed(1)}',
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          Text('${widget.arrivee} → ${widget.depart} · ${h['nuits']} nuit(s)', style: const TextStyle(fontWeight: FontWeight.w600)),
          Row(
            children: [
              const Text('Chambres : '),
              IconButton(onPressed: () => setState(() => _quantite = (_quantite - 1).clamp(1, 5)), icon: const Icon(Icons.remove_circle_outline)),
              Text('$_quantite', style: const TextStyle(fontWeight: FontWeight.w800)),
              IconButton(onPressed: () => setState(() => _quantite = (_quantite + 1).clamp(1, 5)), icon: const Icon(Icons.add_circle_outline)),
            ],
          ),
          if (_hold) const LinearProgressIndicator(),
          ...chambres.map((cRaw) {
            final c = cRaw as Map<String, dynamic>;
            final dispo = c['disponible'] == true;
            final tarifs = (c['tarifs'] as List?) ?? [];
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppCouleurs.blanc, borderRadius: BorderRadius.circular(14)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${c['nom']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                  Text('${c['lits']} · reste ${c['chambresRestantes'] ?? '-'}', style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                  if (!dispo) const Padding(padding: EdgeInsets.only(top: 8), child: Text('Complet', style: TextStyle(color: AppCouleurs.alerte))),
                  ...tarifs.map((tRaw) {
                    final t = tRaw as Map<String, dynamic>;
                    final pol = t['politiqueAnnulation'] as Map<String, dynamic>?;
                    return Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${t['nom']}', style: const TextStyle(fontWeight: FontWeight.w600)),
                                    Text(
                                      '${_prix((t['totalSejour'] as num) * _quantite, t['devise'])} · ${t['petitDejeuner'] == true ? 'PD' : 'Sans PD'}',
                                      style: const TextStyle(fontSize: 13, color: AppCouleurs.primaire, fontWeight: FontWeight.w700),
                                    ),
                                    if (pol != null)
                                      Text('${pol['message']}', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                                  ],
                                ),
                              ),
                              ElevatedButton(
                                onPressed: (!dispo || _hold) ? null : () => _reserver(c, t),
                                child: const Text('Réserver'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            );
          }),
          if (avis.isNotEmpty) ...[
            const SizedBox(height: 8),
            const Text('Avis voyageurs', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            ...avis.take(5).map((aRaw) {
              final a = aRaw as Map<String, dynamic>;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('${a['auteurNom']} · ${a['note']}/5'),
                subtitle: Text('${a['commentaire'] ?? ''}'),
              );
            }),
          ],
        ],
      ),
    );
  }
}
