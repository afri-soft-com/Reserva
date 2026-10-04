import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../services/api_transport.dart';
import '../../widgets/toast.dart';

class TransportDetailScreen extends StatefulWidget {
  final String trajetId;
  final int places;
  const TransportDetailScreen({super.key, required this.trajetId, this.places = 1});

  @override
  State<TransportDetailScreen> createState() => _TransportDetailScreenState();
}

class _TransportDetailScreenState extends State<TransportDetailScreen> {
  Map<String, dynamic>? _trajet;
  bool _chargement = true;
  bool _hold = false;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    try {
      final d = await ApiTransport.detailTrajet(widget.trajetId, places: widget.places);
      if (mounted) setState(() => _trajet = d);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _reserver() async {
    setState(() => _hold = true);
    try {
      final billet = await ApiTransport.creerHold(trajetId: widget.trajetId, places: widget.places);
      if (!mounted) return;
      context.push('/transport/checkout/${billet['id']}');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    } finally {
      if (mounted) setState(() => _hold = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final t = _trajet;
    if (t == null) return const Scaffold(body: Center(child: Text('Trajet introuvable')));
    final op = t['operateur'] as Map<String, dynamic>? ?? {};
    final pol = t['politiqueAnnulation'] as Map<String, dynamic>?;
    final total = ((t['prix'] as num?) ?? 0) * widget.places;

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: Text('${t['origine']} → ${t['destination']}')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${t['heureDepart']} · ${t['dateDepart']}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            Text('${op['nom']} · ${t['confort']}', style: const TextStyle(color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 12),
            Text('${widget.places} place(s) · ${total.toStringAsFixed(0)} FC', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppCouleurs.primaire)),
            const SizedBox(height: 8),
            Text('${t['conditions'] ?? ''}', style: const TextStyle(fontSize: 13)),
            if (pol != null) ...[
              const SizedBox(height: 8),
              Text('${pol['message']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            ],
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_hold || t['disponible'] != true) ? null : _reserver,
                child: Text(_hold ? 'Réservation…' : 'Réserver $total FC'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
