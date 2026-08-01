import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../theme.dart';
import '../../models/models.dart';
import '../../services/api_reservations.dart';
import '../../services/api_chat.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/carte.dart';
import '../../widgets/badge_statut.dart';
import '../../widgets/bouton.dart';
import '../../widgets/toast.dart';
import '../../widgets/qr_code_reservation.dart';
import 'modifier_reservation_screen.dart';

class ReservationDetailScreen extends StatefulWidget {
  final String reservationId;
  const ReservationDetailScreen({super.key, required this.reservationId});

  @override
  State<ReservationDetailScreen> createState() => _ReservationDetailScreenState();
}

class _ReservationDetailScreenState extends State<ReservationDetailScreen> {
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
      final detail = await ApiReservations.obtenirDetail(widget.reservationId);
      if (mounted) setState(() => _detail = detail);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _annuler() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Annuler la réservation'),
        content: const Text('Voulez-vous vraiment annuler cette réservation ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Non')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Oui, annuler')),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      await ApiReservations.annulerReservation(widget.reservationId);
      if (mounted) {
        ToastWidget.show(context, 'Réservation annulée.', type: 'succes');
        context.go('/reservations');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  String _formaterMontant(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  Future<void> _contacter(String participantId, String nom) async {
    try {
      final conv = await ApiChat.creerConversation(participantId);
      if (mounted) context.push('/conversations/${conv['id']}');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_detail == null) return const Scaffold(body: Center(child: Text('Réservation non trouvée')));

    final r = _detail!;
    final auth = context.watch<AuthProvider>();
    final estClient = r.reservation.clientId == auth.utilisateur?.id;

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: Text('Réservation ${r.reservation.numero}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              final texte = 'RESERVA — Réservation ${r.reservation.numero}\n'
                  'Service: ${r.service.nom}\n'
                  'Prestataire: ${r.prestataire.nomEntreprise}\n'
                  'Date: ${r.creneau.debut.substring(0, 10)}\n'
                  'Horaire: ${r.creneau.debut.substring(11, 16)} - ${r.creneau.fin.substring(11, 16)}\n'
                  'Lieu: ${r.prestataire.ville}, ${r.prestataire.quartier}\n'
                  'Montant: ${_formaterMontant(r.reservation.montantTotal, r.reservation.devise)}\n'
                  'Statut: ${BadgeStatut.statutLibelle(r.reservation.statut)}';
              Share.share(texte, subject: 'Réservation RESERVA');
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Carte(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Statut', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      BadgeStatut(statut: r.reservation.statut),
                    ],
                  ),
                  const Divider(height: 20),
                  QrCodeReservation(
                    reservationId: widget.reservationId,
                    numero: r.reservation.numero,
                    statut: BadgeStatut.statutLibelle(r.reservation.statut),
                    service: r.service.nom,
                    prestataire: r.prestataire.nomEntreprise,
                  ),
                  const Divider(height: 24),
                  _ligne('Service', r.service.nom),
                  const SizedBox(height: 8),
                  _ligne('Prestataire', r.prestataire.nomEntreprise),
                  const SizedBox(height: 8),
                  _ligne('Lieu', '${r.prestataire.ville}, ${r.prestataire.quartier}'),
                  const Divider(height: 24),
                  _ligne('Date', r.creneau.debut.substring(0, 10)),
                  const SizedBox(height: 8),
                  _ligne('Horaire', '${r.creneau.debut.substring(11, 16)} - ${r.creneau.fin.substring(11, 16)}'),
                  const Divider(height: 24),
                  _ligne('Montant total', _formaterMontant(r.reservation.montantTotal, r.reservation.devise)),
                  const SizedBox(height: 8),
                  _ligne('Payé', _formaterMontant(r.reservation.montantPaye, r.reservation.devise)),
                ],
              ),
            ),
            if (r.reservation.statut == StatutReservation.enAttente && estClient) ...[
              const SizedBox(height: 16),
              Bouton(titre: 'Modifier le créneau', onPressed: () async {
                final modifie = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(builder: (_) => ModifierReservationScreen(detail: r)),
                );
                if (modifie == true) _charger();
              }),
              const SizedBox(height: 8),
              Bouton(titre: 'Annuler la réservation', variante: 'destructif', onPressed: _annuler),
            ],
            if (r.reservation.statut == StatutReservation.terminee && r.avisNote == null && estClient) ...[
              const SizedBox(height: 16),
              Bouton(
                titre: 'Donner mon avis',
                onPressed: () async {
                  final result = await context.push<bool>('/avis/${widget.reservationId}');
                  if (result == true) _charger();
                },
                icone: Icons.star,
              ),
            ],
            if (r.reservation.statut == StatutReservation.confirmee && r.reservation.statutPaiement != StatutPaiement.paye && estClient) ...[
              const SizedBox(height: 16),
              Bouton(
                titre: 'Payer',
                onPressed: () async {
                  final result = await context.push<bool>('/paiement/${widget.reservationId}');
                  if (result == true) _charger();
                },
                icone: Icons.payment,
              ),
            ],
            ...[
              const SizedBox(height: 8),
              Bouton(
                titre: estClient ? 'Contacter le prestataire' : 'Contacter le client',
                variante: 'secondaire',
                icone: Icons.chat_outlined,
                onPressed: () => _contacter(
                  estClient ? r.prestataire.utilisateurId : r.reservation.clientId,
                  estClient ? r.prestataire.nomEntreprise : 'le client',
                ),
              ),
            ],
            ...[
              const SizedBox(height: 8),
              Bouton(
                titre: 'Historique des transactions',
                variante: 'secondaire',
                onPressed: () => context.push('/transactions/${widget.reservationId}'),
                icone: Icons.receipt_long,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _ligne(String label, String value) {
    return Row(
      children: [
        Text(label, style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
        const Spacer(),
        Flexible(child: Text(value, textAlign: TextAlign.right, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppCouleurs.texte))),
      ],
    );
  }
}
