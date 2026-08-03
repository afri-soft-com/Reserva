import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_admin.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';

class AbonnementsScreen extends StatefulWidget {
  const AbonnementsScreen({super.key});

  @override
  State<AbonnementsScreen> createState() => _AbonnementsScreenState();
}

class _AbonnementsScreenState extends State<AbonnementsScreen> {
  List<dynamic> _abonnements = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      _abonnements = await ApiAdmin.listerAbonnements(parPage: 50);
    } catch (_) {
      _abonnements = [];
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Color _statutCouleur(String? statut) {
    switch (statut) {
      case 'ACTIF': return AppCouleurs.succes;
      case 'EXPIRE': return AppCouleurs.alerte;
      default: return AppCouleurs.avertissement;
    }
  }

  String _formaterDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (_) {
      return iso.substring(0, 10);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Padding(padding: EdgeInsets.all(16), child: Squelette());
    return RefreshIndicator(
      onRefresh: _charger,
      color: AppCouleurs.primaire,
      child: _abonnements.isEmpty
        ? SingleChildScrollView(child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              children: [
                Icon(Icons.card_membership, size: 48, color: AppCouleurs.texteSecondaire),
                const SizedBox(height: 12),
                const Text('Aucun abonnement', style: TextStyle(color: AppCouleurs.texteSecondaire)),
              ],
            ),
          ))
        : ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: _abonnements.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, i) {
              final a = _abonnements[i];
              final plan = a['plan'] as Map<String, dynamic>? ?? {};
              final prestataire = a['prestataire'] as Map<String, dynamic>? ?? {};
              final statut = a['statut'] as String? ?? 'ACTIF';
              final prix = (plan['prix'] as num?)?.toDouble() ?? 0;
              final devise = plan['devise'] as String? ?? 'CDF';
              return Carte(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(prestataire['nomEntreprise'] as String? ?? 'Prestataire',
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: _statutCouleur(statut).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(statut, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _statutCouleur(statut))),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(plan['nom'] as String? ?? 'Plan',
                        style: const TextStyle(fontSize: 13, color: AppCouleurs.primaire, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text('${prestataire['ville'] ?? ''}',
                        style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Du ${_formaterDate(a['dateDebut'] as String?)} au ${_formaterDate(a['dateFin'] as String?)}',
                            style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                          Text('${prix.toStringAsFixed(devise == 'USD' ? 2 : 0)} ${devise == 'USD' ? 'USD' : 'FC'}',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCouleurs.succes)),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
    );
  }
}
