import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
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
  bool _filtresEtendus = false;

  static const _villes = ['Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Kisangani', 'Mbuji-Mayi', 'Kananga'];
  static const _optionsTri = {
    'Recommandés': null,
    'Prix ↑': 'prix_asc',
    'Prix ↓': 'prix_desc',
    'Note': 'note_desc',
    'Nom': 'nom_asc',
  };

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
    return '${_searchCtrl.text}|$_villeFiltre|$_tri|$_prixMin|$_prixMax';
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

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final triActif = _optionsTri.entries.firstWhere((e) => e.value == _tri, orElse: () => const MapEntry('Recommandés', null));

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: Text(widget.categorie != null ? CategorieService.libelle(widget.categorie!) : 'Rechercher'),
        actions: [
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
                hintText: 'Rechercher un service...',
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
                _villeChip(null, 'Toutes'),
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
            child: _chargement
                ? ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: 4,
                    itemBuilder: (_, __) => const CarteSquelette(),
                  )
                : _services.isEmpty
                    ? EcranVide(
                        icone: Icons.search_off,
                        message: _erreur ?? 'Aucun service trouvé',
                        sousTitre: _searchCtrl.text.isNotEmpty ? 'Essayez un autre mot-clé' : 'Aucun service disponible dans cette catégorie',
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
                                          label: const Text('Charger plus'),
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
