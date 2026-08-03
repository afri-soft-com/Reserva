import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../services/api_cartes_cadeaux.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class CartesCadeauxScreen extends StatefulWidget {
  const CartesCadeauxScreen({super.key});

  @override
  State<CartesCadeauxScreen> createState() => _CartesCadeauxScreenState();
}

class _CartesCadeauxScreenState extends State<CartesCadeauxScreen> {
  bool _chargement = true;
  List<dynamic> _cartes = [];
  double _soldeTotal = 0;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final data = await ApiCartesCadeaux.mesCartes();
      if (mounted) {
        setState(() {
          _cartes = data['cartes'] as List<dynamic>? ?? [];
          _soldeTotal = (data['soldeTotal'] as num?)?.toDouble() ?? 0;
        });
      }
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Cartes cadeaux')),
      body: RefreshIndicator(
        onRefresh: _charger,
        color: AppCouleurs.primaire,
        child: _chargement
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Carte(
                    child: Row(
                      children: [
                        Container(
                          width: 46, height: 46,
                          decoration: BoxDecoration(
                            color: AppCouleurs.primaireClair,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.redeem, color: AppCouleurs.primaire),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Solde disponible', style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                              const SizedBox(height: 2),
                              Text(_formater(_soldeTotal, 'CDF'),
                                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Mes cartes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      TextButton.icon(
                        onPressed: () => context.push('/cartes-cadeaux/acheter').then((_) {
                          if (mounted) _charger();
                        }),
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Acheter', style: TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_cartes.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 48),
                      child: EcranVide(
                        icone: Icons.card_giftcard,
                        message: 'Aucune carte cadeau',
                        sousTitre: 'Achetez une carte cadeau à offrir ou à utiliser pour vos réservations.',
                      ),
                    )
                  else
                    ..._cartes.map((c) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Carte(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(c['code'] as String? ?? '',
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, letterSpacing: 1)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: (c['actif'] as bool? ?? false)
                                        ? AppCouleurs.succes.withValues(alpha: 0.1)
                                        : AppCouleurs.texteSecondaire.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    (c['actif'] as bool? ?? false) ? 'ACTIF' : 'INACTIF',
                                    style: TextStyle(
                                      fontSize: 10, fontWeight: FontWeight.w700,
                                      color: (c['actif'] as bool? ?? false) ? AppCouleurs.succes : AppCouleurs.texteSecondaire,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Valeur : ${_formater((c['montant'] as num?)?.toDouble() ?? 0, c['devise'] as String? ?? 'CDF')}',
                                  style: const TextStyle(fontSize: 13)),
                                Text('Solde : ${_formater((c['solde'] as num?)?.toDouble() ?? 0, c['devise'] as String? ?? 'CDF')}',
                                  style: const TextStyle(fontSize: 13, color: AppCouleurs.primaire, fontWeight: FontWeight.w600)),
                              ],
                            ),
                            if (c['dateExpiration'] != null) ...[
                              const SizedBox(height: 4),
                              Text('Expire le ${(c['dateExpiration'] as String).substring(0, 10)}',
                                style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                            ],
                            const SizedBox(height: 6),
                            GestureDetector(
                              onTap: () => context.push('/cartes-cadeaux/${c['code']}'),
                              child: const Text('Voir le détail',
                                style: TextStyle(fontSize: 12, color: AppCouleurs.primaire, fontWeight: FontWeight.w600)),
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
}
