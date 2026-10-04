import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../theme.dart';
import '../../i18n.dart';
import '../../providers/langue_provider.dart';
import '../../models/models.dart';
import '../../services/api_reservations.dart';
import '../../services/api_hotels.dart';
import '../../services/api_transport.dart';
import '../../services/cache_hors_ligne.dart';
import '../../widgets/carte.dart';
import '../../widgets/badge_statut.dart';
import '../../widgets/toast.dart';
import '../../widgets/squelette.dart';

class ReservationsScreen extends StatefulWidget {
  const ReservationsScreen({super.key});

  @override
  State<ReservationsScreen> createState() => _ReservationsScreenState();
}

class _ReservationsScreenState extends State<ReservationsScreen> with AutomaticKeepAliveClientMixin {
  List<ReservationDetaillee> _reservations = [];
  List<dynamic> _sejours = [];
  List<dynamic> _billets = [];
  bool _chargement = true;
  String? _erreur;
  int _ongletActif = 0;

  List<String> get _onglets => [
    AppTraductions.t('toutes'),
    AppTraductions.statut('EN_ATTENTE'),
    AppTraductions.statut('CONFIRMEE'),
    AppTraductions.statut('TERMINEE'),
    AppTraductions.statut('ANNULEE'),
  ];

  String? get _filtreStatut {
    switch (_ongletActif) {
      case 1: return 'EN_ATTENTE';
      case 2: return 'CONFIRMEE';
      case 3: return 'TERMINEE';
      case 4: return 'ANNULEE';
      default: return null;
    }
  }

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() { _chargement = true; _erreur = null; });
    try {
      final results = await Future.wait([
        ApiReservations.listerMesReservations(statut: _filtreStatut),
        ApiHotels.mesSejours(),
        ApiTransport.mesBillets(),
      ]);
      if (mounted) {
        setState(() {
          _reservations = results[0] as List<ReservationDetaillee>;
          _sejours = results[1];
          _billets = results[2];
        });
      }
    } catch (e) {
      if (mounted) setState(() => _erreur = e.toString());
      if (mounted) ToastWidget.show(context, AppTraductions.t('impossibleChargerReservations'), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _formaterMontant(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  Widget _buildBandeauHorsLigne() {
    final date = ApiReservations.cacheSauvegardeLe;
    final texte = date != null
        ? AppTraductions.t('horsLigneDonneesDu').replaceAll('%s', CacheHorsLigne.formaterDate(date))
        : AppTraductions.t('horsLigneDonneesEnregistrees');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppCouleurs.avertissement.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.cloud_off, size: 18, color: AppCouleurs.avertissement),
          const SizedBox(width: 8),
          Expanded(
            child: Text(texte, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppCouleurs.avertissement)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    context.watch<LangueProvider>();
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: Text(AppTraductions.t('mesReservations'))),
      body: Column(
        children: [
          Container(
            height: 44,
            margin: const EdgeInsets.only(top: 8),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: List.generate(_onglets.length, (i) {
                final actif = i == _ongletActif;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(_onglets[i], style: TextStyle(fontSize: 13, color: actif ? Colors.white : AppCouleurs.texteSecondaire)),
                    selected: actif,
                    selectedColor: AppCouleurs.primaire,
                    backgroundColor: AppCouleurs.blanc,
                    onSelected: (_) {
                      setState(() => _ongletActif = i);
                      _charger();
                    },
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  ),
                );
              }),
            ),
          ),
          if (ApiReservations.horsLigne) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: _buildBandeauHorsLigne(),
            ),
          ],
          Expanded(
            child: _chargement
                ? ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: 4,
                    itemBuilder: (_, __) => const CarteSquelette(),
                  )
                : _reservations.isEmpty && _sejours.isEmpty && _billets.isEmpty
                    ? EcranVide(
                        icone: Icons.calendar_today,
                        message: _erreur ?? AppTraductions.t('aucuneReservation'),
                        sousTitre: _erreur != null ? AppTraductions.t('tirezPourReessayer') : AppTraductions.t('aucuneReservationCategorie'),
                        action: _erreur != null ? null : ElevatedButton.icon(
                          onPressed: () => context.go('/services'),
                          icon: const Icon(Icons.search, size: 18),
                          label: Text(AppTraductions.t('parcourirServices')),
                          style: ElevatedButton.styleFrom(backgroundColor: AppCouleurs.primaire, foregroundColor: AppCouleurs.blanc),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _charger,
                        color: AppCouleurs.primaire,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _billets.length + _sejours.length + _reservations.length,
                          itemBuilder: (ctx, i) {
                            if (i < _billets.length) {
                              final b = _billets[i] as Map<String, dynamic>;
                              return GestureDetector(
                                onTap: () => context.push('/transport/billet/${b['id']}'),
                                child: Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Carte(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('${b['numero']} · BUS', style: const TextStyle(fontWeight: FontWeight.w700)),
                                        Text('${b['origine']} → ${b['destination']}', style: const TextStyle(fontSize: 15)),
                                        Text('${b['dateDepart']} ${b['heureDepart']} · ${b['statut']}',
                                          style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }
                            final j = i - _billets.length;
                            if (j < _sejours.length) {
                              final s = _sejours[j] as Map<String, dynamic>;
                              return GestureDetector(
                                onTap: () => context.push('/hotels/sejour/${s['id']}'),
                                child: Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Carte(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('${s['numero']} · HÔTEL', style: const TextStyle(fontWeight: FontWeight.w700)),
                                        Text('${s['hotelNom']}', style: const TextStyle(fontSize: 15)),
                                        Text('${s['arrivee']} → ${s['depart']} · ${s['statut']}',
                                          style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }
                            final r = _reservations[j - _sejours.length];
                            return GestureDetector(
                              onTap: () async {
                                await context.push('/reservation/${r.reservation.id}');
                                if (mounted) _charger();
                              },
                              child: Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Carte(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Row(
                                              children: [
                                                Flexible(
                                                  child: Text(r.reservation.numero, style: const TextStyle(fontWeight: FontWeight.w700, color: AppCouleurs.texte)),
                                                ),
                                                if (r.reservation.recurrenceGroupeId != null) ...[
                                                  const SizedBox(width: 6),
                                                  const Icon(Icons.repeat, size: 14, color: AppCouleurs.primaire),
                                                ],
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          BadgeStatut(statut: r.reservation.statut),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(r.service.nom, style: const TextStyle(fontSize: 15, color: AppCouleurs.texte)),
                                      const SizedBox(height: 4),
                                      Text(r.prestataire.nomEntreprise, style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${_formaterMontant(r.reservation.montantTotal, r.reservation.devise)} · ${r.reservation.montantPaye > 0 ? "${AppTraductions.t('paye')}: ${_formaterMontant(r.reservation.montantPaye, r.reservation.devise)}" : AppTraductions.t('nonPaye')}',
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppCouleurs.primaire),
                                        maxLines: 1, overflow: TextOverflow.ellipsis,
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
}
