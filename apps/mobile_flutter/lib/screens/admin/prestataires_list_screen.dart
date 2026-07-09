import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_admin.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class PrestatairesListScreen extends StatefulWidget {
  const PrestatairesListScreen({super.key});

  @override
  State<PrestatairesListScreen> createState() => _PrestatairesListScreenState();
}

class _PrestatairesListScreenState extends State<PrestatairesListScreen> {
  List<dynamic> _prestataires = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      _prestataires = await ApiAdmin.listerPrestataires(parPage: 50);
    } catch (_) {
      _prestataires = [];
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Color _couleurStatut(String? statut) {
    switch (statut) {
      case 'APPROUVE': return AppCouleurs.succes;
      case 'EN_ATTENTE_VALIDATION': return AppCouleurs.avertissement;
      case 'REJETE': return AppCouleurs.alerte;
      case 'SUSPENDU': return AppCouleurs.texteSecondaire;
      default: return AppCouleurs.texteSecondaire;
    }
  }

  String _libelleStatut(String? statut) {
    switch (statut) {
      case 'APPROUVE': return 'Approuvé';
      case 'EN_ATTENTE_VALIDATION': return 'En attente';
      case 'REJETE': return 'Rejeté';
      case 'SUSPENDU': return 'Suspendu';
      default: return statut ?? 'Inconnu';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Padding(padding: EdgeInsets.all(16), child: Squelette());
    return RefreshIndicator(
      onRefresh: _charger,
      color: AppCouleurs.primaire,
      child: _prestataires.isEmpty
        ? SingleChildScrollView(child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              children: [
                Icon(Icons.business, size: 48, color: AppCouleurs.texteSecondaire),
                const SizedBox(height: 12),
                const Text('Aucun prestataire', style: TextStyle(color: AppCouleurs.texteSecondaire)),
              ],
            ),
          ))
        : ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: _prestataires.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, i) {
              final p = _prestataires[i];
              final user = p['utilisateur'] as Map<String, dynamic>? ?? {};
              final statut = p['statut'] as String? ?? '';
              return GestureDetector(
                onTap: () => _showDetailDialog(context, p, _couleurStatut, _libelleStatut, _charger),
                child: Carte(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(p['nomEntreprise'] as String? ?? '',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                            decoration: BoxDecoration(
                              color: _couleurStatut(statut).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(_libelleStatut(statut),
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _couleurStatut(statut))),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text('${user['nom'] ?? ''} • ${user['telephone'] ?? ''}',
                        style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                      Text('${p['ville'] ?? ''}, ${p['quartier'] ?? ''}',
                        style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                      if (p['motifRejet'] != null) ...[
                        const SizedBox(height: 4),
                        Text('Motif: ${p['motifRejet']}',
                          style: const TextStyle(fontSize: 12, color: AppCouleurs.alerte)),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
    );
  }
}

void _showDetailDialog(BuildContext context, Map<String, dynamic> p, Color Function(String?) couleurStatut, String Function(String?) libelleStatut, VoidCallback recharger) {
  final motifCtrl = TextEditingController();
  bool envoi = false;

  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDialogState) => AlertDialog(
        title: Text(p['nomEntreprise'] as String? ?? ''),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _ligneInfo('Catégorie', p['categorie'] as String? ?? ''),
              _ligneInfo('Ville', p['ville'] as String? ?? ''),
              _ligneInfo('Quartier', p['quartier'] as String? ?? ''),
              _ligneInfo('Contact', '${(p['utilisateur'] as Map?)?['nom'] ?? ''} • ${(p['utilisateur'] as Map?)?['telephone'] ?? ''}'),
              const SizedBox(height: 8),
              Row(children: [
                const Text('Statut: ', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: couleurStatut(p['statut'] as String?).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(libelleStatut(p['statut'] as String?),
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: couleurStatut(p['statut'] as String?))),
                ),
              ]),
              if (p['motifRejet'] != null) ...[
                const SizedBox(height: 8),
                Text('Motif du rejet: ${p['motifRejet']}', style: const TextStyle(fontSize: 12, color: AppCouleurs.alerte)),
              ],
              if (p['statut'] == 'EN_ATTENTE_VALIDATION') ...[
                const SizedBox(height: 12),
                TextField(
                  controller: motifCtrl,
                  decoration: const InputDecoration(labelText: 'Motif de rejet', border: OutlineInputBorder()),
                  maxLines: 2,
                ),
              ],
            ],
          ),
        ),
        actions: p['statut'] == 'EN_ATTENTE_VALIDATION'
          ? [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Fermer')),
              ElevatedButton(
                onPressed: envoi ? null : () async {
                  setDialogState(() => envoi = true);
                  try {
                    await ApiAdmin.validerPrestataire(p['id'] as String, true, null);
                    if (ctx.mounted) {
                      Navigator.pop(ctx);
                      ToastWidget.show(ctx, 'Prestataire approuvé.', type: 'succes');
                      recharger();
                    }
                  } catch (e) {
                    if (ctx.mounted) ToastWidget.show(ctx, e.toString(), type: 'erreur');
                  } finally {
                    if (ctx.mounted) setDialogState(() => envoi = false);
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppCouleurs.succes, foregroundColor: AppCouleurs.blanc),
                child: envoi ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Approuver'),
              ),
              ElevatedButton(
                onPressed: envoi || motifCtrl.text.trim().isEmpty ? null : () async {
                  setDialogState(() => envoi = true);
                  try {
                    await ApiAdmin.validerPrestataire(p['id'] as String, false, motifCtrl.text.trim());
                    if (ctx.mounted) {
                      Navigator.pop(ctx);
                      ToastWidget.show(ctx, 'Prestataire rejeté.', type: 'succes');
                      recharger();
                    }
                  } catch (e) {
                    if (ctx.mounted) ToastWidget.show(ctx, e.toString(), type: 'erreur');
                  } finally {
                    if (ctx.mounted) setDialogState(() => envoi = false);
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppCouleurs.alerte, foregroundColor: AppCouleurs.blanc),
                child: envoi ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Rejeter'),
              ),
            ]
          : [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Fermer'))],
      ),
    ),
  );
}

Widget _ligneInfo(String label, String valeur) {
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: Row(
      children: [
        Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        Expanded(child: Text(valeur, style: const TextStyle(fontSize: 13))),
      ],
    ),
  );
}
