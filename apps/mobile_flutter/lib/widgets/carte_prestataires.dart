import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../theme.dart';
import '../services/api_prestataire.dart';
import '../widgets/toast.dart';

class CartePrestataires extends StatefulWidget {
  const CartePrestataires({super.key});

  @override
  State<CartePrestataires> createState() => _CartePrestatairesState();
}

class _CartePrestatairesState extends State<CartePrestataires> {
  List<Map<String, dynamic>> _prestataires = [];
  Position? _position;
  bool _charge = true;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _initLocation() async {
    try {
      final permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (mounted) setState(() => _charge = false);
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      if (!mounted) return;
      setState(() => _position = pos);
      await _charger(pos);
    } catch (_) {
      if (mounted) {
        setState(() => _charge = false);
        ToastWidget.show(context, 'Impossible d\'obtenir la position', type: 'erreur');
      }
    }
  }

  Future<void> _charger(Position pos) async {
    setState(() => _charge = true);
    try {
      final data = await ApiPrestataire.listerProches(pos.latitude, pos.longitude, rayonKm: 20);
      if (!mounted) return;
      setState(() => _prestataires = data.cast<Map<String, dynamic>>());
    } catch (_) {
      if (mounted) ToastWidget.show(context, 'Erreur chargement prestataires', type: 'erreur');
    } finally {
      if (mounted) setState(() => _charge = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_charge && _prestataires.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final markers = <Marker>[
      if (_position != null)
        Marker(
          point: LatLng(_position!.latitude, _position!.longitude),
          width: 40, height: 40,
          child: Container(
            decoration: BoxDecoration(
              color: AppCouleurs.primaire,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 6)],
            ),
            child: const Icon(Icons.my_location, color: Colors.white, size: 20),
          ),
        ),
      for (final p in _prestataires)
        if (p['latitude'] != null && p['longitude'] != null)
          Marker(
            point: LatLng((p['latitude'] as num).toDouble(), (p['longitude'] as num).toDouble()),
            width: 80, height: 40,
            child: GestureDetector(
              onTap: () => _showDetail(p),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppCouleurs.primaire, width: 2),
                  boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 4)],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.store, size: 14, color: AppCouleurs.primaire),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(p['nomEntreprise'] as String? ?? '',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis),
                    ),
                  ],
                ),
              ),
            ),
          ),
    ];

    return Column(
      children: [
        Expanded(
          child: FlutterMap(
            options: MapOptions(
              initialCenter: _position != null
                  ? LatLng(_position!.latitude, _position!.longitude)
                  : const LatLng(-4.3050, 15.3050),
              initialZoom: 12,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.reserva.app',
              ),
              MarkerLayer(markers: markers),
              if (_prestataires.isEmpty && !_charge)
                RichAttributionWidget(
                  attributions: [
                    TextSourceAttribution('Aucun prestataire trouvé à proximité'),
                  ],
                ),
            ],
          ),
        ),
        if (_prestataires.isNotEmpty)
          SizedBox(
            height: 90,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(8),
              itemCount: _prestataires.length,
              itemBuilder: (_, i) => _buildCarteMini(_prestataires[i]),
            ),
          ),
      ],
    );
  }

  Widget _buildCarteMini(Map<String, dynamic> p) {
    return GestureDetector(
      onTap: () => _showDetail(p),
      child: Container(
        width: 160,
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(p['nomEntreprise'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text('${p['categorie'] ?? ''} • ${p['ville'] ?? ''}',
                style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 2),
            Row(children: [
              const Icon(Icons.star, size: 12, color: Colors.amber),
              const SizedBox(width: 2),
              Text((p['noteMoyenne'] as num?)?.toStringAsFixed(1) ?? "-",
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
              const SizedBox(width: 4),
              Text('(${(p['nombreAvis'] as int?) ?? 0})', style: const TextStyle(fontSize: 10, color: AppCouleurs.texteSecondaire)),
            ]),
          ],
        ),
      ),
    );
  }

  void _showDetail(Map<String, dynamic> p) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            Text(p['nomEntreprise'] as String? ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.category, size: 14, color: AppCouleurs.texteSecondaire),
              const SizedBox(width: 4),
              Text(p['categorie'] as String? ?? '', style: const TextStyle(color: AppCouleurs.texteSecondaire)),
              const SizedBox(width: 16),
              const Icon(Icons.location_on, size: 14, color: AppCouleurs.texteSecondaire),
              const SizedBox(width: 4),
              Text('${p['ville'] ?? ''}, ${p['quartier'] ?? ''}', style: const TextStyle(color: AppCouleurs.texteSecondaire)),
            ]),
            if (p['adresse'] != null) ...[
              const SizedBox(height: 4),
              Text(p['adresse'] as String, style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
            ],
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.star, size: 16, color: Colors.amber),
              const SizedBox(width: 4),
              Text('${(p['noteMoyenne'] as num?)?.toStringAsFixed(1) ?? "-"} (${(p['nombreAvis'] as int?) ?? 0})',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ]),
            const SizedBox(height: 4),
            if (p['description'] != null)
              Text(p['description'] as String, maxLines: 3, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () { Navigator.pop(ctx); context.push('/services'); },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppCouleurs.primaire,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Voir les services disponibles'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
