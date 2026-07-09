import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../models/models.dart';
import '../../services/api_paiements.dart';
import '../../services/api_reservations.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';

class HistoriqueTransactionsScreen extends StatefulWidget {
  final String reservationId;
  const HistoriqueTransactionsScreen({super.key, required this.reservationId});

  @override
  State<HistoriqueTransactionsScreen> createState() => _HistoriqueTransactionsScreenState();
}

class _HistoriqueTransactionsScreenState extends State<HistoriqueTransactionsScreen> {
  List<Transaction> _transactions = [];
  ReservationDetaillee? _detail;
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final results = await Future.wait([
        ApiPaiements.listerTransactions(widget.reservationId),
        ApiReservations.obtenirDetail(widget.reservationId),
      ]);
      if (mounted) {
        setState(() {
          _transactions = results[0] as List<Transaction>;
          _detail = results[1] as ReservationDetaillee;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _transactions = [];
          _detail = null;
        });
      }
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _formater(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  Color _couleurStatut(String s) {
    switch (s) {
      case 'PAYE': return AppCouleurs.succes;
      case 'EN_ATTENTE': return AppCouleurs.avertissement;
      case 'ECHOUE': return AppCouleurs.alerte;
      case 'REMBOURSE': return AppCouleurs.texteSecondaire;
      default: return AppCouleurs.texteSecondaire;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Transactions')),
      body: _chargement
        ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
        : RefreshIndicator(
            onRefresh: _charger,
            color: AppCouleurs.primaire,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_detail != null)
                  Carte(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Résumé', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        _ligne('Total', _formater(_detail!.reservation.montantTotal, _detail!.reservation.devise)),
                        _ligne('Payé', _formater(_detail!.reservation.montantPaye, _detail!.reservation.devise)),
                        _ligne('Statut', _detail!.reservation.statutPaiement),
                      ],
                    ),
                  ),
                const SizedBox(height: 16),
                const Text('Historique', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                if (_transactions.isEmpty)
                  EcranVide(icone: Icons.receipt_long, message: 'Aucune transaction')
                else
                  ..._transactions.map((t) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Carte(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: _couleurStatut(t.statut).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(Icons.payment, size: 20, color: _couleurStatut(t.statut)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(t.operateur, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                const SizedBox(height: 2),
                                Text(
                                  '${t.creeLe.substring(0, 10)} • ${t.referenceExterne ?? ""}',
                                  style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(_formater(t.montant, t.devise),
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                              const SizedBox(height: 2),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: _couleurStatut(t.statut).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(t.statut,
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _couleurStatut(t.statut))),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  )),
              ],
            ),
          ),
    );
  }

  Widget _ligne(String label, String valeur) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
          const Spacer(),
          Flexible(child: Text(valeur, textAlign: TextAlign.right, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}
