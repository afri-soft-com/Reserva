import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../models/models.dart';
import '../../services/api_reservations.dart';
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
  bool _chargement = true;
  String? _erreur;
  int _ongletActif = 0;

  static const _onglets = ['Toutes', 'En attente', 'Confirmées', 'Terminées', 'Annulées'];

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
      final reservations = await ApiReservations.listerMesReservations(statut: _filtreStatut);
      if (mounted) setState(() => _reservations = reservations);
    } catch (e) {
      if (mounted) setState(() => _erreur = e.toString());
      if (mounted) ToastWidget.show(context, 'Impossible de charger les réservations', type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _formaterMontant(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Mes réservations')),
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
          Expanded(
            child: _chargement
                ? ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: 4,
                    itemBuilder: (_, __) => const CarteSquelette(),
                  )
                : _reservations.isEmpty
                    ? EcranVide(
                        icone: Icons.calendar_today,
                        message: _erreur ?? 'Aucune réservation',
                        sousTitre: _erreur != null ? 'Tirez pour réessayer' : 'Aucune réservation dans cette catégorie.',
                        action: _erreur != null ? null : ElevatedButton.icon(
                          onPressed: () => context.go('/services'),
                          icon: const Icon(Icons.search, size: 18),
                          label: const Text('Parcourir les services'),
                          style: ElevatedButton.styleFrom(backgroundColor: AppCouleurs.primaire, foregroundColor: AppCouleurs.blanc),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _charger,
                        color: AppCouleurs.primaire,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _reservations.length,
                          itemBuilder: (ctx, i) {
                            final r = _reservations[i];
                            return GestureDetector(
                              onTap: () => context.go('/reservation/${r.reservation.id}'),
                              child: Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Carte(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(r.reservation.numero, style: const TextStyle(fontWeight: FontWeight.w700, color: AppCouleurs.texte)),
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
                                        '${_formaterMontant(r.reservation.montantTotal, r.reservation.devise)} · ${r.reservation.montantPaye > 0 ? "Payé: ${_formaterMontant(r.reservation.montantPaye, r.reservation.devise)}" : "Non payé"}',
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
