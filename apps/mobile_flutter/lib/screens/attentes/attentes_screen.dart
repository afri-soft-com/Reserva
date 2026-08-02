import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_attentes.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class AttentesScreen extends StatefulWidget {
  const AttentesScreen({super.key});

  @override
  State<AttentesScreen> createState() => _AttentesScreenState();
}

class _AttentesScreenState extends State<AttentesScreen> {
  List<Map<String, dynamic>> _attentes = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final attentes = await ApiAttentes.listerMesAttentes();
      if (mounted) {
        setState(() => _attentes = attentes.map((a) => a as Map<String, dynamic>).toList());
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _quitter(Map<String, dynamic> entree) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Quitter la file d\'attente'),
        content: const Text('Voulez-vous vraiment vous retirer de cette file d\'attente ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Non')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Oui, quitter')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ApiAttentes.quitter(entree['id'] as String);
      if (mounted) {
        ToastWidget.show(context, 'Vous avez quitté la file d\'attente.', type: 'succes');
        _charger();
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  String _libelleStatut(String statut) {
    switch (statut) {
      case 'EN_ATTENTE': return 'En attente';
      case 'NOTIFIE': return 'Place disponible !';
      case 'RESERVE': return 'Réservé automatiquement';
      default: return 'Retiré';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Mes files d\'attente')),
      body: _chargement
        ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
        : RefreshIndicator(
            onRefresh: _charger,
            color: AppCouleurs.primaire,
            child: _attentes.isEmpty
              ? ListView(
                  children: [
                    const SizedBox(height: 120),
                    EcranVide(
                      icone: Icons.queue,
                      message: 'Aucune inscription',
                      sousTitre: 'Inscrivez-vous en file d\'attente sur un créneau complet : vous serez réservé automatiquement si une place se libère.',
                    ),
                  ],
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _attentes.length,
                  itemBuilder: (ctx, i) {
                    final e = _attentes[i];
                    final service = e['service'] as Map<String, dynamic>? ?? {};
                    final creneau = e['creneau'] as Map<String, dynamic>? ?? {};
                    final nomService = service['nom'] as String? ?? 'Service';
                    final nomPrestataire = (service['prestataire'] as Map<String, dynamic>?)?['nomEntreprise'] as String? ?? '';
                    final statut = e['statut'] as String? ?? 'EN_ATTENTE';
                    final debut = creneau['debut'] as String? ?? '';
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Carte(
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppCouleurs.primaireClair,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.schedule, color: AppCouleurs.primaire, size: 22),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(nomService,
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                  if (nomPrestataire.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(nomPrestataire,
                                      style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                                  ],
                                  if (debut.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text('${debut.substring(0, 10)} • ${debut.substring(11, 16)}',
                                      style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                                  ],
                                  const SizedBox(height: 4),
                                  Text(_libelleStatut(statut),
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                                      color: statut == 'EN_ATTENTE' ? AppCouleurs.accent : AppCouleurs.succes)),
                                ],
                              ),
                            ),
                            if (statut == 'EN_ATTENTE')
                              IconButton(
                                icon: const Icon(Icons.logout, color: AppCouleurs.alerte),
                                onPressed: () => _quitter(e),
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
