import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_alertes.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class AlertesScreen extends StatefulWidget {
  const AlertesScreen({super.key});

  @override
  State<AlertesScreen> createState() => _AlertesScreenState();
}

class _AlertesScreenState extends State<AlertesScreen> {
  List<Map<String, dynamic>> _alertes = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final alertes = await ApiAlertes.listerMesAlertes();
      if (mounted) {
        setState(() => _alertes = alertes.map((a) => a as Map<String, dynamic>).toList());
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _desactiver(Map<String, dynamic> alerte) async {
    try {
      await ApiAlertes.desactiverAlerte(alerte['id'] as String);
      if (mounted) {
        ToastWidget.show(context, 'Alerte désactivée.', type: 'succes');
        _charger();
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Mes alertes de disponibilité')),
      body: _chargement
        ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
        : RefreshIndicator(
            onRefresh: _charger,
            color: AppCouleurs.primaire,
            child: _alertes.isEmpty
              ? ListView(
                  children: [
                    const SizedBox(height: 120),
                    EcranVide(
                      icone: Icons.notifications_active_outlined,
                      message: 'Aucune alerte',
                      sousTitre: 'Activez une alerte sur un service complet pour être prévenu dès qu\'un créneau se libère.',
                    ),
                  ],
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _alertes.length,
                  itemBuilder: (ctx, i) {
                    final a = _alertes[i];
                    final service = a['service'] as Map<String, dynamic>? ?? {};
                    final nomService = service['nom'] as String? ?? 'Service';
                    final actif = a['actif'] as bool? ?? true;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Carte(
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppCouleurs.accent.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.notifications_active, color: AppCouleurs.accent, size: 22),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(nomService,
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                  const SizedBox(height: 2),
                                  Text(actif ? 'Alerte active' : 'Alerte désactivée',
                                    style: TextStyle(fontSize: 12,
                                      color: actif ? AppCouleurs.succes : AppCouleurs.texteSecondaire)),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, color: AppCouleurs.alerte),
                              onPressed: () => _desactiver(a),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
          ),
    );
  }
}
