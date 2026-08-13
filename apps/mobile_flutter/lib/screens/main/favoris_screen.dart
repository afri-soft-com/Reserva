import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../i18n.dart';
import '../../models/models.dart';
import '../../services/api_favoris.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class FavorisScreen extends StatefulWidget {
  const FavorisScreen({super.key});

  @override
  State<FavorisScreen> createState() => _FavorisScreenState();
}

class _FavorisScreenState extends State<FavorisScreen> with AutomaticKeepAliveClientMixin {
  static const _parPage = 20;
  List<ServiceAvecPrestataire> _favoris = [];
  int _page = 1;
  int _total = 0;
  bool _chargement = true;
  bool _chargementPlus = false;

  @override
  bool get wantKeepAlive => true;

  bool get _afficherPlus => _favoris.length < _total;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final resultat = await ApiFavoris.listerFavorisPage(page: 1, parPage: _parPage);
      if (mounted) {
        setState(() {
          _favoris = resultat.services;
          _total = resultat.total;
          _page = 1;
        });
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, AppTraductions.t('erreurChargement'), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _chargerPlus() async {
    if (_chargementPlus || _favoris.length >= _total) return;
    setState(() => _chargementPlus = true);
    try {
      final resultat = await ApiFavoris.listerFavorisPage(page: _page + 1, parPage: _parPage);
      if (mounted) {
        setState(() {
          _favoris = [..._favoris, ...resultat.services];
          _total = resultat.total;
          _page += 1;
        });
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, AppTraductions.t('erreurChargement'), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargementPlus = false);
    }
  }

  String _formaterMontant(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  Future<void> _supprimerFavori(String serviceId) async {
    try {
      await ApiFavoris.supprimerFavori(serviceId);
      if (!mounted) return;
      setState(() => _favoris.removeWhere((s) => s.id == serviceId));
      ToastWidget.show(context, AppTraductions.t('retireDesFavoris'));
    } catch (e) {
      if (!mounted) return;
      ToastWidget.show(context, AppTraductions.t('erreur'), type: 'erreur');
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: Text(AppTraductions.t('mesFavoris'))),
      body: _chargement
          ? ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: 3,
              itemBuilder: (_, __) => const CarteSquelette(),
            )
          : _favoris.isEmpty
              ? EcranVide(
                  icone: Icons.favorite_border,
                  message: AppTraductions.t('aucunFavori'),
                  sousTitre: AppTraductions.t('aucunFavoriSousTitre'),
                  action: ElevatedButton.icon(
                    onPressed: () => context.go('/services'),
                    icon: const Icon(Icons.search, size: 18),
                    label: Text(AppTraductions.t('decouvrirServices')),
                    style: ElevatedButton.styleFrom(backgroundColor: AppCouleurs.primaire, foregroundColor: AppCouleurs.blanc),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _charger,
                  color: AppCouleurs.primaire,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _favoris.length + (_afficherPlus ? 1 : 0),
                    itemBuilder: (ctx, i) {
                      if (i >= _favoris.length) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: _chargementPlus ? null : _chargerPlus,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppCouleurs.primaire,
                                side: const BorderSide(color: AppCouleurs.primaire),
                              ),
                              child: _chargementPlus
                                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                                  : Text(AppTraductions.t('afficherPlus')),
                            ),
                          ),
                        );
                      }
                      final s = _favoris[i];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: GestureDetector(
                          onTap: () async {
                            await context.push('/service/${s.id}');
                            if (mounted) _charger();
                          },
                          child: Carte(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      width: 48, height: 48,
                                      decoration: BoxDecoration(color: AppCouleurs.primaireClair, borderRadius: BorderRadius.circular(12)),
                                      child: const Icon(Icons.miscellaneous_services, color: AppCouleurs.primaire, size: 24),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(s.nom, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                          const SizedBox(height: 2),
                                          Text(s.nomEntreprise, style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                                          const SizedBox(height: 2),
                                          Row(
                                            children: [
                                              const Icon(Icons.location_on, size: 12, color: AppCouleurs.texteSecondaire),
                                              const SizedBox(width: 2),
                                              Text(s.ville, style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: () => _supprimerFavori(s.id),
                                      child: const Icon(Icons.favorite, color: AppCouleurs.alerte, size: 22),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(_formaterMontant(s.prix, s.devise),
                                      style: const TextStyle(fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
                                    Row(
                                      children: [
                                        const Icon(Icons.star, size: 14, color: AppCouleurs.accent),
                                        const SizedBox(width: 2),
                                        Text('${s.noteMoyenne.toStringAsFixed(1)} (${s.nombreAvis})',
                                          style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
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
    );
  }
}
