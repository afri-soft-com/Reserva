import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../services/api_cartes_cadeaux.dart';
import '../../services/api_reservations.dart';
import '../../models/models.dart';
import '../../widgets/carte.dart';
import '../../widgets/toast.dart';

class DetailCarteCadeauScreen extends StatefulWidget {
  final String code;
  const DetailCarteCadeauScreen({super.key, required this.code});

  @override
  State<DetailCarteCadeauScreen> createState() => _DetailCarteCadeauScreenState();
}

class _DetailCarteCadeauScreenState extends State<DetailCarteCadeauScreen> {
  bool _chargement = true;
  Map<String, dynamic>? _carte;
  bool _envoi = false;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final carte = await ApiCartesCadeaux.detailParCode(widget.code);
      if (mounted) setState(() => _carte = carte);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _formater(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  Future<void> _utiliserSurReservation() async {
    if (_carte == null) return;
    setState(() => _envoi = true);
    try {
      final reservations = await ApiReservations.listerMesReservations();
      if (!mounted) return;
      final utilisables = reservations
          .where((r) => r.reservation.statutPaiement != StatutPaiement.paye)
          .where((r) => !['ANNULEE', 'REFUSEE', 'TERMINEE'].contains(r.reservation.statut))
          .toList();
      if (utilisables.isEmpty) {
        ToastWidget.show(context, 'Aucune réservation éligible pour le paiement.', type: 'erreur');
        return;
      }
      final choisie = await showModalBottomSheet<ReservationDetaillee>(
        context: context,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (ctx) => SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Choisir une réservation à régler',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
              ...utilisables.map((r) => ListTile(
                leading: const Icon(Icons.calendar_month, color: AppCouleurs.primaire),
                title: Text('${r.reservation.numero} — ${r.service.nom}',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                subtitle: Text('Reste à payer : ${_formater(r.reservation.montantTotal - r.reservation.montantPaye, r.reservation.devise)}',
                  style: const TextStyle(fontSize: 12)),
                onTap: () => Navigator.pop(ctx, r),
              )),
            ],
          ),
        ),
      );
      if (choisie == null || !mounted) return;

      final resultat = await ApiCartesCadeaux.utiliser(
        code: widget.code,
        reservationId: choisie.reservation.id,
      );
      if (mounted) {
        ToastWidget.show(context,
          '${resultat['montantConsomme']} réglés. Reste : ${resultat['montantRestant']}.',
          type: 'succes');
        await _charger();
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Carte cadeau')),
      body: _chargement
          ? const Center(child: CircularProgressIndicator())
          : _carte == null
              ? const Center(child: Text('Carte introuvable'))
              : RefreshIndicator(
                  onRefresh: _charger,
                  color: AppCouleurs.primaire,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: _buildContenu(),
                  ),
                ),
    );
  }

  List<Widget> _buildContenu() {
    final c = _carte!;
    final valide = c['valide'] as bool? ?? false;
    final expiree = c['expiree'] as bool? ?? false;
    final acheteur = c['acheteur'] as Map<String, dynamic>? ?? {};
    final beneficiaire = c['beneficiaire'] as Map<String, dynamic>?;

    return [
      Carte(
        child: Column(
          children: [
            const SizedBox(height: 8),
            const Icon(Icons.redeem, size: 48, color: AppCouleurs.primaire),
            const SizedBox(height: 12),
            Text(c['code'] as String? ?? '',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 2)),
            const SizedBox(height: 8),
            Text(_formater((c['solde'] as num?)?.toDouble() ?? 0, c['devise'] as String? ?? 'CDF'),
              style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
            const SizedBox(height: 4),
            Text('solde restant', style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: valide
                    ? AppCouleurs.succes.withValues(alpha: 0.1)
                    : AppCouleurs.alerte.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                valide ? 'VALIDE' : expiree ? 'EXPIRÉE' : 'INUTILISABLE',
                style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w700,
                  color: valide ? AppCouleurs.succes : AppCouleurs.alerte,
                ),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      Carte(
        child: Column(
          children: [
            _ligne('Valeur initiale', _formater((c['montant'] as num?)?.toDouble() ?? 0, c['devise'] as String? ?? 'CDF')),
            const Divider(height: 24),
            _ligne('Achetée par', acheteur['nom'] as String? ?? '—'),
            const Divider(height: 24),
            _ligne('Bénéficiaire', beneficiaire?['nom'] as String? ?? '—'),
            if (c['dateExpiration'] != null) ...[
              const Divider(height: 24),
              _ligne('Expire le', (c['dateExpiration'] as String).substring(0, 10)),
            ],
          ],
        ),
      ),
      if (valide) ...[
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _envoi ? null : _utiliserSurReservation,
            icon: const Icon(Icons.payment),
            label: const Text('Utiliser sur une réservation'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppCouleurs.primaire,
              foregroundColor: AppCouleurs.blanc,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ],
      const SizedBox(height: 24),
      Center(
        child: TextButton(
          onPressed: () => context.go('/cartes-cadeaux'),
          child: const Text('Retour aux cartes', style: TextStyle(color: AppCouleurs.primaire)),
        ),
      ),
    ];
  }

  Widget _ligne(String label, String valeur) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
        Text(valeur, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      ],
    );
  }
}
