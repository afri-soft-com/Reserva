import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../services/api_transport.dart';
import '../../widgets/toast.dart';

class TransportCheckoutScreen extends StatefulWidget {
  final String billetId;
  const TransportCheckoutScreen({super.key, required this.billetId});

  @override
  State<TransportCheckoutScreen> createState() => _TransportCheckoutScreenState();
}

class _TransportCheckoutScreenState extends State<TransportCheckoutScreen> {
  Map<String, dynamic>? _billet;
  bool _chargement = true;
  bool _paiement = false;
  String _operateur = 'MPESA';
  final _telCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _charger();
  }

  @override
  void dispose() {
    _telCtrl.dispose();
    super.dispose();
  }

  Future<void> _charger() async {
    try {
      final b = await ApiTransport.obtenirBillet(widget.billetId);
      if (mounted) setState(() => _billet = b);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _payer() async {
    final b = _billet;
    if (b == null) return;
    final restant = ((b['montantTotal'] as num?) ?? 0) - ((b['montantPaye'] as num?) ?? 0);
    setState(() => _paiement = true);
    try {
      final r = await ApiTransport.payerBillet(
        billetId: widget.billetId,
        operateur: _operateur,
        montant: restant.toDouble(),
        telephonePaiement: _operateur == 'ESPECES' ? null : _telCtrl.text.trim(),
      );
      if (!mounted) return;
      ToastWidget.show(context, '${r['message'] ?? 'OK'}', type: 'succes');
      await _charger();
      final maj = r['billet'] as Map<String, dynamic>?;
      if (!mounted) return;
      if (maj?['statut'] == 'CONFIRME') context.go('/transport/billet/${widget.billetId}');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    } finally {
      if (mounted) setState(() => _paiement = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final b = _billet;
    if (b == null) return const Scaffold(body: Center(child: Text('Billet introuvable')));
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: Text('${b['numero']}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('${b['origine']} → ${b['destination']}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          Text('${b['operateurNom']} · ${b['dateDepart']} ${b['heureDepart']}'),
          Text('${b['places']} place(s) · ${(b['montantTotal'] as num).toStringAsFixed(0)} ${b['devise']}',
            style: const TextStyle(fontWeight: FontWeight.w700, color: AppCouleurs.primaire)),
          if (b['statut'] == 'HOLD')
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Option jusqu’à ${b['expireLe']}', style: const TextStyle(color: AppCouleurs.avertissement)),
            ),
          const SizedBox(height: 16),
          if (b['statut'] == 'HOLD' || b['statutPaiement'] != 'PAYE') ...[
            DropdownButtonFormField<String>(
              value: _operateur,
              items: const [
                DropdownMenuItem(value: 'MPESA', child: Text('M-Pesa')),
                DropdownMenuItem(value: 'AIRTEL_MONEY', child: Text('Airtel Money')),
                DropdownMenuItem(value: 'ORANGE_MONEY', child: Text('Orange Money')),
                DropdownMenuItem(value: 'ESPECES', child: Text('Espèces à la gare')),
              ],
              onChanged: (v) => setState(() => _operateur = v ?? 'MPESA'),
              decoration: const InputDecoration(labelText: 'Paiement'),
            ),
            if (_operateur != 'ESPECES') ...[
              const SizedBox(height: 8),
              TextField(controller: _telCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Téléphone')),
            ],
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _paiement ? null : _payer, child: Text(_paiement ? '…' : 'Payer')),
          ],
        ],
      ),
    );
  }
}
