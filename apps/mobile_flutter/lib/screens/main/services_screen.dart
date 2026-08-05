import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../theme.dart';
import '../../i18n.dart';
import '../../providers/langue_provider.dart';
import '../../models/models.dart';
import '../../services/api_services.dart';
import '../../services/api_favoris.dart';
import '../../services/service_cache.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class ServicesScreen extends StatefulWidget {
  final String? categorie;
  const ServicesScreen({super.key, this.categorie});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> with AutomaticKeepAliveClientMixin {
  List<ServiceAvecPrestataire> _services = [];
  Set<String> _favorisIds = {};
  bool _chargement = true;
  bool _chargePlus = false;
  bool _aPlus = true;
  int _page = 1;
  String? _erreur;
  final _searchCtrl = TextEditingController();
  Timer? _debounce;
  String? _villeFiltre;
  String? _tri;
  double? _prixMin;
  double? _prixMax;
  double? _noteMin;
  int? _rayonKm;
  double? _lat;
  double? _lng;
  String? _disponibilite;
  bool _afficheCarte = false;
  bool _positionnement = false;
  bool _filtresEtendus = false;

  static const _villes = ['Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Kisangani', 'Mbuji-Mayi', 'Kananga'];
  static const _optionsTri = {
    'Recommandés': null,
    'Prix ↑': 'prix_asc',
    'Prix ↓': 'prix_desc',
    'Note': 'note_desc',
    'Nom': 'nom_asc',
    'Proximité': 'distance_asc',
    'Disponible le plus tôt': 'disponible_asc',
  };
  static const _optionsDisponibilite = {
    'Toutes': null,
    "Disponible aujourd'hui": 'aujourdhui',
    'Sous 24h': '24h',
  };
  static const _optionsRayon = {'Tout': null, '5 km': 5, '10 km': 10, '20 km': 20, '50 km': 50, '100 km': 100};

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _charger();
    _searchCtrl.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _page = 1;
      _charger();
    });
  }

  String _cacheCle() {
    return '${_searchCtrl.text}|$_villeFiltre|$_tri|$_prixMin|$_prixMax|$_noteMin|$_rayonKm|$_lat|$_lng|$_disponibilite';
  }

  Future<void> _charger() async {
    setState(() { _chargement = true; _erreur = null; _aPlus = true; });
    try {
      final cacheKey = _cacheCle();
      final cached = await ServiceCache.recupererCache<List<dynamic>>('services', parametres: cacheKey);
      if (cached != null && _page == 1) {
        final decoded = cached.map((e) => ServiceAvecPrestataire.fromJson(e as Map<String, dynamic>)).toList();
        if (mounted) {
          setState(() {
            _services = decoded;
            _page = 1;
            _aPlus = decoded.length >= 20;
          });
        }
        _chargement = false;
        if (mounted) setState(() {});
        return;
      }

      final results = await Future.wait([
        ApiServices.rechercherServices(
          categorie: widget.categorie,
          texte: _searchCtrl.text.isNotEmpty ? _searchCtrl.text : null,
          ville: _villeFiltre,
          tri: _tri,
          prixMin: _prixMin,
          prixMax: _prixMax,
          noteMin: _noteMin,
          latitude: _lat,
          longitude: _lng,
          rayonKm: _rayonKm,
          disponibilite: _disponibilite,
          page: 1,
          parPage: 20,
        ),
        ApiFavoris.obtenirIdsFavoris(),
      ]);
      if (mounted) {
        final services = results[0] as List<ServiceAvecPrestataire>;
        setState(() {
          _services = services;
          _favorisIds = results[1] as Set<String>;
          _page = 1;
          _aPlus = services.length >= 20;
        });
        ServiceCache.mettreEnCache('services', services.map((e) => e.toJson()).toList(), parametres: cacheKey);
      }
    } catch (e) {
      if (mounted) setState(() => _erreur = e.toString());
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _chargerPlus() async {
    if (_chargePlus || !_aPlus) return;
    setState(() => _chargePlus = true);
    try {
      final data = await ApiServices.rechercherServices(
        categorie: widget.categorie,
        texte: _searchCtrl.text.isNotEmpty ? _searchCtrl.text : null,
        ville: _villeFiltre,
        tri: _tri,
        prixMin: _prixMin,
        prixMax: _prixMax,
        noteMin: _noteMin,
        latitude: _lat,
        longitude: _lng,
        rayonKm: _rayonKm,
        disponibilite: _disponibilite,
        page: _page + 1,
        parPage: 20,
      );
      if (mounted) {
        setState(() {
          _services.addAll(data);
          _page++;
          _aPlus = data.length >= 20;
        });
      }
    } catch (_) {
      if (mounted) ToastWidget.show(context, 'Erreur de chargement', type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargePlus = false);
    }
  }

  Future<void> _activerCarte() async {
    if (_positionnement) return;
    setState(() => _positionnement = true);
    try {
      final permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        if (mounted) ToastWidget.show(context, 'Autorisation de localisation refusée.', type: 'erreur');
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
      );
      if (!mounted) return;
      setState(() {
        _lat = pos.latitude;
        _lng = pos.longitude;
        _rayonKm = _rayonKm ?? 10;
        if (_tri != 'distance_asc') _tri = 'distance_asc';
        _afficheCarte = true;
      });
      _page = 1;
      await _charger();
    } catch (e) {
      if (mounted) ToastWidget.show(context, 'Impossible d\'obtenir votre position.', type: 'erreur');
    } finally {
      if (mounted) setState(() => _positionnement = false);
    }
  }

  void _desactiverCarte() {
    setState(() => _afficheCarte = false);
  }

  Widget _buildCarte() {
    if (_lat == null || _lng == null) {
      return const Center(child: Text('Localisation indisponible', style: TextStyle(color: AppCouleurs.texteSecondaire)));
    }
    final marqueurs = _services.where((s) => s.latitude != null && s.longitude != null).map((s) {
      return Marker(
        point: LatLng(s.latitude!, s.longitude!),
        width: 44,
        height: 44,
        child: GestureDetector(
          onTap: () => context.go('/service/${s.id}'),
          child: Container(
            decoration: BoxDecoration(
              color: AppCouleurs.primaire,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppCouleurs.blanc, width: 2),
            ),
            child: const Icon(Icons.store, size: 20, color: Colors.white),
          ),
        ),
      );
    }).toList();

    return Stack(
      children: [
        FlutterMap(
          options: MapOptions(
            initialCenter: LatLng(_lat!, _lng!),
            initialZoom: 11,
            interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.reserva.app',
            ),
            MarkerLayer(markers: [
              Marker(
                point: LatLng(_lat!, _lng!),
                width: 26,
                height: 26,
                child: Container(
                  decoration: BoxDecoration(
                    color: AppCouleurs.accent,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
              ...marqueurs,
            ]),
          ],
        ),
        Positioned(
          top: 8,
          left: 8,
          child: Material(
            color: AppCouleurs.blanc,
            borderRadius: BorderRadius.circular(10),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Text('${marqueurs.length} prestataire(s)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ),
        ),
        Positioned(
          bottom: 12,
          right: 12,
          child: FloatingActionButton.small(
            heroTag: 'recentrer',
            backgroundColor: AppCouleurs.primaire,
            onPressed: _activerCarte,
            child: const Icon(Icons.my_location, color: Colors.white, size: 20),
          ),
        ),
      ],
    );
  }

  Future<void> _basculerFavori(String serviceId) async {
    try {
      if (_favorisIds.contains(serviceId)) {
        await ApiFavoris.supprimerFavori(serviceId);
        if (!mounted) return;
        setState(() => _favorisIds.remove(serviceId));
        ToastWidget.show(context, 'Retiré des favoris');
      } else {
        await ApiFavoris.ajouterFavori(serviceId);
        if (!mounted) return;
        setState(() => _favorisIds.add(serviceId));
        ToastWidget.show(context, 'Ajouté aux favoris', type: 'succes');
      }
    } catch (e) {
      if (!mounted) return;
      ToastWidget.show(context, 'Erreur', type: 'erreur');
    }
  }

  String _formaterMontant(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  CreneauSimple? _prochainCreneau(ServiceAvecPrestataire s) {
    final maintenant = DateTime.now();
    final creneaux = s.creneaux.where((c) {
      final debut = DateTime.tryParse(c.debut);
      return debut != null && debut.isAfter(maintenant);
    }).toList()
      ..sort((a, b) => a.debut.compareTo(b.debut));
    return creneaux.isNotEmpty ? creneaux.first : null;
  }

  Widget _ligneProchainCreneau(ServiceAvecPrestataire s) {
    final c = _prochainCreneau(s);
    if (c == null) return const SizedBox.shrink();
    final places = c.capaciteTotale - c.capaciteReservee;
    final date = c.debut.substring(0, 10);
    final horaire = '${c.debut.substring(11, 16)} - ${c.fin.substring(11, 16)}';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppCouleurs.primaire.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.schedule, size: 14, color: AppCouleurs.primaire),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              'Prochain créneau : $date à $horaire',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCouleurs.primaire),
            ),
          ),
          const SizedBox(width: 6),
          Icon(places > 0 ? Icons.event_available : Icons.event_busy, size: 14,
              color: places > 0 ? AppCouleurs.succes : AppCouleurs.alerte),
          const SizedBox(width: 4),
          Text(
            places > 0 ? '$places places' : 'Complet',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: places > 0 ? AppCouleurs.succes : AppCouleurs.alerte),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    context.watch<LangueProvider>();
    final triActif = _optionsTri.entries.firstWhere((e) => e.value == _tri, orElse: () => const MapEntry('Recommandés', null));

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: Text(widget.categorie != null ? CategorieService.libelle(widget.categorie!) : AppTraductions.t('recherche')),
        actions: [
          IconButton(
            icon: Icon(_afficheCarte ? Icons.list : Icons.map_outlined, size: 20),
            tooltip: _afficheCarte ? 'Voir la liste' : 'Voir la carte',
            onPressed: _afficheCarte ? _desactiverCarte : _activerCarte,
          ),
          IconButton(
            icon: Icon(_filtresEtendus ? Icons.filter_list_off : Icons.filter_list, size: 20),
            onPressed: () => setState(() => _filtresEtendus = !_filtresEtendus),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: AppTraductions.t('rechercherService'),
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () { _searchCtrl.clear(); _page = 1; _charger(); })
                    : null,
                filled: true,
                fillColor: AppCouleurs.blanc,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
              ),
            ),
          ),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                _villeChip(null, AppTraductions.t('toutes')),
                ..._villes.map((v) => _villeChip(v, v)),
              ],
            ),
          ),
          if (_filtresEtendus)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppCouleurs.blanc,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Filtres de prix', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    const SizedBox(height: 8),
                    RangeSlider(
                      values: RangeValues(_prixMin ?? 0, _prixMax ?? 500000),
                      min: 0,
                      max: 500000,
                      divisions: 50,
                      labels: RangeLabels(
                        _prixMin != null ? '${_prixMin!.toStringAsFixed(0)} FC' : '0 FC',
                        _prixMax != null ? '${_prixMax!.toStringAsFixed(0)} FC' : '500k FC',
                      ),
                      activeColor: AppCouleurs.primaire,
                      onChanged: (v) {
                        setState(() {
                          _prixMin = v.start > 0 ? v.start : null;
                          _prixMax = v.end < 500000 ? v.end : null;
                        });
                      },
                      onChangeEnd: (_) { _page = 1; _charger(); },
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(_prixMin != null ? _formaterMontant(_prixMin!, 'CDF') : 'Min', style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                        Text(_prixMax != null ? _formaterMontant(_prixMax!, 'CDF') : 'Max', style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                      ],
                    ),
                    const Divider(height: 20),
                    const Text('Note minimale', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    Row(
                      children: [
                        Expanded(
                          child: Slider(
                            value: _noteMin ?? 0,
                            min: 0,
                            max: 5,
                            divisions: 10,
                            activeColor: AppCouleurs.primaire,
                            label: (_noteMin ?? 0).toStringAsFixed(1),
                            onChanged: (v) => setState(() => _noteMin = v >= 1 ? v : null),
                            onChangeEnd: (_) { _page = 1; _charger(); },
                          ),
                        ),
                        Text(_noteMin != null ? '${_noteMin!.toStringAsFixed(1)} ★' : 'Toutes', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        const SizedBox(width: 8),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Rayon de recherche', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        DropdownButton<int?>(
                          value: _rayonKm,
                          isDense: true,
                          underline: const SizedBox(),
                          items: _optionsRayon.entries.map((e) => DropdownMenuItem(
                            value: e.value,
                            child: Text(e.key, style: const TextStyle(fontSize: 13)),
                          )).toList(),
                          onChanged: (v) {
                            setState(() => _rayonKm = v);
                            _page = 1;
                            _charger();
                          },
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    const Text('Disponibilité', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: _optionsDisponibilite.entries.map((e) {
                        final actif = _disponibilite == e.value;
                        return ChoiceChip(
                          label: Text(e.key, style: TextStyle(fontSize: 12, color: actif ? Colors.white : AppCouleurs.texteSecondaire)),
                          selected: actif,
                          selectedColor: AppCouleurs.primaire,
                          backgroundColor: AppCouleurs.fond,
                          onSelected: (_) {
                            setState(() => _disponibilite = e.value);
                            _page = 1;
                            _charger();
                          },
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                const Icon(Icons.sort, size: 16, color: AppCouleurs.texteSecondaire),
                const SizedBox(width: 6),
                DropdownButton<String>(
                  value: triActif.value,
                  isDense: true,
                  underline: const SizedBox(),
                  items: _optionsTri.entries.map((e) => DropdownMenuItem(
                    value: e.value,
                    child: Text(e.key, style: const TextStyle(fontSize: 13)),
                  )).toList(),
                  onChanged: (v) {
                    setState(() => _tri = v);
                    _page = 1;
                    _charger();
                  },
                ),
                const Spacer(),
              ],
            ),
          ),
          Expanded(
            child: _afficheCarte
                ? _buildCarte()
                : _chargement
                ? ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: 4,
                    itemBuilder: (_, __) => const CarteSquelette(),
                  )
                : _services.isEmpty
                    ? EcranVide(
                        icone: Icons.search_off,
                        message: _erreur ?? AppTraductions.t('aucunServiceTrouve'),
                        sousTitre: _searchCtrl.text.isNotEmpty ? AppTraductions.t('essayerAutreMotCle') : AppTraductions.t('aucunServiceCategorie'),
                      )
                    : RefreshIndicator(
                        onRefresh: _charger,
                        color: AppCouleurs.primaire,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _services.length + (_aPlus ? 1 : 0),
                          itemBuilder: (ctx, i) {
                            if (i == _services.length) {
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                child: Center(
                                  child: _chargePlus
                                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                                      : TextButton.icon(
                                          onPressed: _chargerPlus,
                                          icon: const Icon(Icons.expand_more, size: 18),
                                          label: Text(AppTraductions.t('chargerPlus')),
                                        ),
                                ),
                              );
                            }
                            final s = _services[i];
                            final estFavori = _favorisIds.contains(s.id);
                            return GestureDetector(
                              onTap: () => context.go('/service/${s.id}'),
                              child: Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Carte(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Expanded(
                                            child: Text(CategorieService.libelle(s.categorie),
                                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCouleurs.primaire)),
                                          ),
                                          GestureDetector(
                                            onTap: () => _basculerFavori(s.id),
                                            child: Icon(
                                              estFavori ? Icons.favorite : Icons.favorite_border,
                                              size: 20, color: estFavori ? AppCouleurs.alerte : AppCouleurs.texteSecondaire,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(s.nom, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppCouleurs.texte)),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          const Icon(Icons.location_on, size: 14, color: AppCouleurs.texteSecondaire),
                                          const SizedBox(width: 4),
                                          Expanded(child: Text('${s.ville}, ${s.quartier}', style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire))),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(_formaterMontant(s.prix, s.devise), style: const TextStyle(fontWeight: FontWeight.w700, color: AppCouleurs.primaire)),
                                          Row(
                                            children: [
                                              const Icon(Icons.star, size: 16, color: AppCouleurs.accent),
                                              const SizedBox(width: 4),
                                              Text('${s.noteMoyenne.toStringAsFixed(1)} (${s.nombreAvis})', style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                                            ],
                                          ),
                                        ],
                                      ),
                                      if (_prochainCreneau(s) != null) ...[
                                        const SizedBox(height: 8),
                                        _ligneProchainCreneau(s),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _villeChip(String? ville, String label) {
    final actif = _villeFiltre == ville;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label, style: TextStyle(fontSize: 12, color: actif ? Colors.white : AppCouleurs.texteSecondaire)),
        selected: actif,
        selectedColor: AppCouleurs.primaire,
        backgroundColor: AppCouleurs.blanc,
        onSelected: (_) {
          setState(() => _villeFiltre = ville);
          _page = 1;
          _charger();
        },
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }
}
