import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../theme.dart';
import '../../services/api_hotels.dart';
import '../../widgets/toast.dart';

class HotelsRechercheScreen extends StatefulWidget {
  const HotelsRechercheScreen({super.key});

  @override
  State<HotelsRechercheScreen> createState() => _HotelsRechercheScreenState();
}

class _HotelsRechercheScreenState extends State<HotelsRechercheScreen> {
  final _villeCtrl = TextEditingController(text: 'Kinshasa');
  late DateTime _arrivee;
  late DateTime _depart;
  int _adultes = 2;
  int _enfants = 0;
  int _etoilesMin = 0;
  bool _annulationGratuite = false;
  bool _petitDejeuner = false;
  String _tri = 'note';
  bool _carte = false;
  bool _chargement = false;
  List<dynamic> _items = [];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _arrivee = DateTime(now.year, now.month, now.day).add(const Duration(days: 1));
    _depart = _arrivee.add(const Duration(days: 2));
    _rechercher();
  }

  @override
  void dispose() {
    _villeCtrl.dispose();
    super.dispose();
  }

  String _yyyymmdd(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _prix(dynamic montant, dynamic devise) {
    final m = (montant as num?)?.toDouble() ?? 0;
    return devise == 'USD' ? '\$${m.toStringAsFixed(0)}' : '${m.toStringAsFixed(0)} FC';
  }

  Future<void> _choisirDate({required bool arrivee}) async {
    final initial = arrivee ? _arrivee : _depart;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 55)),
    );
    if (picked == null) return;
    setState(() {
      if (arrivee) {
        _arrivee = picked;
        if (!_depart.isAfter(_arrivee)) _depart = _arrivee.add(const Duration(days: 1));
      } else if (picked.isAfter(_arrivee)) {
        _depart = picked;
      }
    });
  }

  Future<void> _rechercher() async {
    setState(() => _chargement = true);
    try {
      final r = await ApiHotels.rechercher(
        ville: _villeCtrl.text.trim(),
        arrivee: _yyyymmdd(_arrivee),
        depart: _yyyymmdd(_depart),
        adultes: _adultes,
        enfants: _enfants,
        etoilesMin: _etoilesMin > 0 ? _etoilesMin : null,
        annulationGratuite: _annulationGratuite,
        petitDejeuner: _petitDejeuner,
        tri: _tri,
      );
      if (mounted) setState(() => _items = (r['items'] as List?) ?? []);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: const Text('Hôtels'),
        actions: [
          IconButton(
            icon: Icon(_carte ? Icons.list : Icons.map_outlined),
            onPressed: () => setState(() => _carte = !_carte),
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: AppCouleurs.blanc,
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                TextField(
                  controller: _villeCtrl,
                  decoration: const InputDecoration(labelText: 'Ville', prefixIcon: Icon(Icons.location_city), isDense: true),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(child: OutlinedButton(onPressed: () => _choisirDate(arrivee: true), child: Text(_yyyymmdd(_arrivee)))),
                    const SizedBox(width: 6),
                    Expanded(child: OutlinedButton(onPressed: () => _choisirDate(arrivee: false), child: Text(_yyyymmdd(_depart)))),
                  ],
                ),
                Row(
                  children: [
                    Expanded(child: _stepper('Ad.', _adultes, (v) => setState(() => _adultes = v.clamp(1, 8)))),
                    Expanded(child: _stepper('Enf.', _enfants, (v) => setState(() => _enfants = v.clamp(0, 6)))),
                    DropdownButton<String>(
                      value: _tri,
                      items: const [
                        DropdownMenuItem(value: 'note', child: Text('Note')),
                        DropdownMenuItem(value: 'prix', child: Text('Prix')),
                        DropdownMenuItem(value: 'etoiles', child: Text('Étoiles')),
                      ],
                      onChanged: (v) => setState(() => _tri = v ?? 'note'),
                    ),
                  ],
                ),
                Wrap(
                  spacing: 6,
                  children: [
                    FilterChip(label: const Text('Annul. gratuite'), selected: _annulationGratuite, onSelected: (v) => setState(() => _annulationGratuite = v)),
                    FilterChip(label: const Text('Petit-déj.'), selected: _petitDejeuner, onSelected: (v) => setState(() => _petitDejeuner = v)),
                    ...[3, 4, 5].map((e) => FilterChip(
                      label: Text('$e★+'),
                      selected: _etoilesMin == e,
                      onSelected: (v) => setState(() => _etoilesMin = v ? e : 0),
                    )),
                  ],
                ),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _chargement ? null : _rechercher,
                    icon: const Icon(Icons.search),
                    label: Text(_chargement ? 'Recherche…' : 'Rechercher'),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _chargement
                ? const Center(child: CircularProgressIndicator())
                : _items.isEmpty
                    ? const Center(child: Text('Aucun hôtel pour ces critères.'))
                    : _carte
                        ? _buildCarte()
                        : ListView.separated(
                            padding: const EdgeInsets.all(12),
                            itemCount: _items.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (_, i) => _carteHotel(_items[i] as Map<String, dynamic>),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildCarte() {
    final markers = <Marker>[];
    LatLng center = const LatLng(-4.32, 15.3);
    for (final raw in _items) {
      final h = raw as Map<String, dynamic>;
      final lat = (h['latitude'] as num?)?.toDouble();
      final lng = (h['longitude'] as num?)?.toDouble();
      if (lat == null || lng == null) continue;
      center = LatLng(lat, lng);
      markers.add(Marker(
        point: LatLng(lat, lng),
        width: 40,
        height: 40,
        child: GestureDetector(
          onTap: () => _ouvrirDetail(h),
          child: const Icon(Icons.location_on, color: AppCouleurs.primaire, size: 36),
        ),
      ));
    }
    return FlutterMap(
      options: MapOptions(initialCenter: center, initialZoom: 11),
      children: [
        TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.reserva.client'),
        MarkerLayer(markers: markers),
      ],
    );
  }

  Widget _carteHotel(Map<String, dynamic> h) {
    final photos = (h['photos'] as List?) ?? [];
    return InkWell(
      onTap: () => _ouvrirDetail(h),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppCouleurs.blanc,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: photos.isNotEmpty
                  ? Image.network('${photos.first}', width: 72, height: 72, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _placeholder())
                  : _placeholder(),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${h['nom']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                  Text('${h['ville']}, ${h['quartier']} · ${'★' * ((h['etoiles'] as num?)?.toInt() ?? 0)}',
                    style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 14, color: AppCouleurs.accent),
                      Text(' ${(h['noteMoyenne'] as num?)?.toStringAsFixed(1) ?? '-'}'),
                      if (h['annulationGratuite'] == true) ...[
                        const SizedBox(width: 8),
                        const Text('Annul. libre', style: TextStyle(fontSize: 11, color: AppCouleurs.succes, fontWeight: FontWeight.w600)),
                      ],
                      const Spacer(),
                      Text(_prix(h['prixDepuis'], h['devise']), style: const TextStyle(fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() => Container(width: 72, height: 72, color: AppCouleurs.primaireClair, child: const Icon(Icons.hotel, color: AppCouleurs.primaire));

  void _ouvrirDetail(Map<String, dynamic> h) {
    context.push('/hotels/${h['id']}', extra: {
      'arrivee': _yyyymmdd(_arrivee),
      'depart': _yyyymmdd(_depart),
      'adultes': _adultes,
      'enfants': _enfants,
    });
  }

  Widget _stepper(String label, int valeur, ValueChanged<int> onChanged) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(fontSize: 12)),
        IconButton(visualDensity: VisualDensity.compact, onPressed: () => onChanged(valeur - 1), icon: const Icon(Icons.remove, size: 16)),
        Text('$valeur', style: const TextStyle(fontWeight: FontWeight.w700)),
        IconButton(visualDensity: VisualDensity.compact, onPressed: () => onChanged(valeur + 1), icon: const Icon(Icons.add, size: 16)),
      ],
    );
  }
}
