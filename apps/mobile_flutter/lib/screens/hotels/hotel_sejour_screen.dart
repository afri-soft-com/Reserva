import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../theme.dart';
import '../../services/api_hotels.dart';
import '../../widgets/toast.dart';

class HotelSejourScreen extends StatefulWidget {
  final String sejourId;
  const HotelSejourScreen({super.key, required this.sejourId});

  @override
  State<HotelSejourScreen> createState() => _HotelSejourScreenState();
}

class _HotelSejourScreenState extends State<HotelSejourScreen> {
  Map<String, dynamic>? _sejour;
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
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

  Future<void> _annuler() async {
    try {
      await ApiHotels.annulerSejour(widget.sejourId);
      if (mounted) {
        ToastWidget.show(context, 'Séjour annulé', type: 'succes');
        context.go('/reservations');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final s = _sejour;
    if (s == null) return const Scaffold(body: Center(child: Text('Séjour introuvable')));
    final numero = '${s['numero'] ?? ''}';
    final confirme = s['statut'] == 'CONFIRME' || s['statutPaiement'] == 'PAYE';
    final qrData = 'RESERVA-HTL:$numero';

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Confirmation hôtel')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(numero, style: const TextStyle(color: AppCouleurs.texteSecondaire, fontWeight: FontWeight.w700)),
            Text('${s['hotelNom']}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('${s['chambreNom']} · ${s['ville']}'),
            Text('${s['arrivee']} → ${s['depart']}'),
            const SizedBox(height: 8),
            Text('Statut : ${s['statut']} · Paiement : ${s['statutPaiement']}'),
            if (confirme && numero.isNotEmpty) ...[
              const SizedBox(height: 24),
              Center(
                child: Column(
                  children: [
                    QrImageView(data: qrData, size: 180),
                    const SizedBox(height: 8),
                    Text('Présentez ce QR à l’arrivée', style: TextStyle(color: AppCouleurs.texteSecondaire, fontSize: 13)),
                  ],
                ),
              ),
            ],
            const Spacer(),
            if (s['statut'] == 'HOLD' || s['statut'] == 'CONFIRME')
              OutlinedButton(
                onPressed: _annuler,
                child: const Text('Annuler le séjour'),
              ),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => context.go('/accueil'),
              child: const Text('Retour à l’accueil'),
            ),
          ],
        ),
      ),
    );
  }
}
