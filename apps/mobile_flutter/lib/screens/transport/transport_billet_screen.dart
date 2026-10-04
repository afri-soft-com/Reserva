import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../theme.dart';
import '../../services/api_transport.dart';
import '../../widgets/toast.dart';

class TransportBilletScreen extends StatefulWidget {
  final String billetId;
  const TransportBilletScreen({super.key, required this.billetId});

  @override
  State<TransportBilletScreen> createState() => _TransportBilletScreenState();
}

class _TransportBilletScreenState extends State<TransportBilletScreen> {
  Map<String, dynamic>? _billet;
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
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

  Future<void> _annuler() async {
    try {
      await ApiTransport.annulerBillet(widget.billetId);
      if (mounted) {
        ToastWidget.show(context, 'Billet annulé', type: 'succes');
        context.go('/reservations');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final b = _billet;
    if (b == null) return const Scaffold(body: Center(child: Text('Billet introuvable')));
    final qr = '${b['qrCode'] ?? 'RESERVA-BUS:${b['numero']}'}';
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Mon billet')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text('${b['numero']}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppCouleurs.texteSecondaire)),
            Text('${b['origine']} → ${b['destination']}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            Text('${b['dateDepart']} ${b['heureDepart']} · ${b['operateurNom']}'),
            Text('Statut : ${b['statut']} · ${b['places']} place(s)'),
            const SizedBox(height: 24),
            if (b['statut'] == 'CONFIRME')
              QrImageView(data: qr, size: 180),
            const Spacer(),
            if (b['statut'] == 'HOLD' || b['statut'] == 'CONFIRME')
              OutlinedButton(onPressed: _annuler, child: const Text('Annuler')),
            ElevatedButton(onPressed: () => context.go('/accueil'), child: const Text('Accueil')),
          ],
        ),
      ),
    );
  }
}
