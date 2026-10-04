import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../services/api_hotels.dart';
import '../../widgets/toast.dart';

class HotelCheckoutScreen extends StatefulWidget {
  final String sejourId;
  const HotelCheckoutScreen({super.key, required this.sejourId});

  @override
  State<HotelCheckoutScreen> createState() => _HotelCheckoutScreenState();
}

class _HotelCheckoutScreenState extends State<HotelCheckoutScreen> {
  Map<String, dynamic>? _sejour;
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
      final s = await ApiHotels.obtenirSejour(widget.sejourId);
      if (mounted) setState(() => _sejour = s);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _prix(dynamic montant, dynamic devise) {
    final m = (montant as num?)?.toDouble() ?? 0;
    return devise == 'USD' ? '\$${m.toStringAsFixed(2)}' : '${m.toStringAsFixed(0)} FC';
  }

  Future<void> _payer() async {
    final s = _sejour;
    if (s == null) return;
    final restant = ((s['montantTotal'] as num?) ?? 0) - ((s['montantPaye'] as num?) ?? 0);
    setState(() => _paiement = true);
    try {
      final r = await ApiHotels.payerSejour(
        sejourId: widget.sejourId,
        operateur: _operateur,
        montant: restant.toDouble(),
        telephonePaiement: _operateur == 'ESPECES' ? null : _telCtrl.text.trim(),
      );
      if (!mounted) return;
      ToastWidget.show(context, '${r['message'] ?? 'Paiement traité'}', type: 'succes');
      await _charger();
      final maj = r['sejour'] as Map<String, dynamic>?;
      if (!mounted) return;
      if (maj?['statut'] == 'CONFIRME') {
        context.go('/hotels/sejour/${widget.sejourId}');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    } finally {
      if (mounted) setState(() => _paiement = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final s = _sejour;
    if (s == null) return const Scaffold(body: Center(child: Text('Séjour introuvable')));
    final expire = s['expireLe']?.toString();
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: Text('${s['numero']}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('${s['hotelNom']}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          Text('${s['chambreNom']} · ${s['tarifNom']}', style: const TextStyle(color: AppCouleurs.texteSecondaire)),
          const SizedBox(height: 8),
          Text('${s['arrivee']} → ${s['depart']} · ${s['nuits']} nuit(s)'),
          const SizedBox(height: 8),
          Text('Total ${_prix(s['montantTotal'], s['devise'])}',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
          if (s['statut'] == 'HOLD')
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Option valable jusqu’à ${expire ?? '15 min'}',
                style: const TextStyle(color: AppCouleurs.avertissement, fontWeight: FontWeight.w600)),
            ),
          const SizedBox(height: 16),
          if (s['statut'] == 'HOLD' || s['statutPaiement'] != 'PAYE') ...[
            DropdownButtonFormField<String>(
              value: _operateur,
              items: const [
                DropdownMenuItem(value: 'MPESA', child: Text('M-Pesa')),
                DropdownMenuItem(value: 'AIRTEL_MONEY', child: Text('Airtel Money')),
                DropdownMenuItem(value: 'ORANGE_MONEY', child: Text('Orange Money')),
                DropdownMenuItem(value: 'ESPECES', child: Text('Espèces à l’hôtel')),
              ],
              onChanged: (v) => setState(() => _operateur = v ?? 'MPESA'),
              decoration: const InputDecoration(labelText: 'Moyen de paiement'),
            ),
            if (_operateur != 'ESPECES') ...[
              const SizedBox(height: 8),
              TextField(
                controller: _telCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Téléphone Mobile Money'),
              ),
            ],
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _paiement ? null : _payer,
              child: Text(_paiement ? 'Traitement…' : 'Payer maintenant'),
            ),
          ],
          if (s['statut'] == 'CONFIRME')
            ElevatedButton(
              onPressed: () => context.go('/hotels/sejour/${widget.sejourId}'),
              child: const Text('Voir la confirmation'),
            ),
        ],
      ),
    );
  }
}
