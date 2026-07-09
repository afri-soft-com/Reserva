import 'dart:convert';
import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_admin.dart';
import '../../widgets/carte.dart';
import '../../widgets/toast.dart';

class PlansScreen extends StatefulWidget {
  const PlansScreen({super.key});

  @override
  State<PlansScreen> createState() => _PlansScreenState();
}

class _PlansScreenState extends State<PlansScreen> {
  List<dynamic> _plans = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final items = await ApiAdmin.listerPlans();
      if (mounted) setState(() => _plans = items);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _formaterMontant(dynamic montant, String devise) {
    final m = (montant as num?)?.toDouble() ?? 0;
    if (devise == 'USD') return '\$${m.toStringAsFixed(2)}';
    return '${m.toStringAsFixed(0)} FC';
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Center(child: CircularProgressIndicator());

    return _plans.isEmpty
        ? const Center(child: Text('Aucun plan d\'abonnement.', style: TextStyle(color: AppCouleurs.texteSecondaire)))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _plans.length,
            itemBuilder: (ctx, i) {
              final p = _plans[i] as Map<String, dynamic>;
              final fonctionnalites = (p['fonctionnalites'] as String? ?? '[]');
              final listeFeatures = fonctionnalites == '[]' ? <String>[] : List<String>.from(jsonDecode(fonctionnalites) as List);

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Carte(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(p['nom'] as String, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppCouleurs.texte)),
                          ),
                          if (p['actif'] != true)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(12)),
                              child: const Text('Inactif', style: TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(_formaterMontant(p['prix'], p['devise'] as String? ?? 'CDF'),
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
                      Text('/ ${p['dureeJours']} jours', style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                      if (p['description'] != null && (p['description'] as String).isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(p['description'] as String, style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                      ],
                      if (listeFeatures.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        ...listeFeatures.map((f) => Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Row(children: [
                            const Icon(Icons.check_circle, size: 14, color: AppCouleurs.succes),
                            const SizedBox(width: 6),
                            Text(f, style: const TextStyle(fontSize: 13, color: AppCouleurs.texte)),
                          ]),
                        )),
                      ],
                    ],
                  ),
                ),
              );
            },
          );
  }
}
