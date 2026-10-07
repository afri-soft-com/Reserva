import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
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

  Color _couleurKyc(String? s) {
    switch (s) {
      case 'VALIDE': return AppCouleurs.succes;
      case 'EN_REVUE': return AppCouleurs.avertissement;
      case 'INFO_MANQUANTE': return AppCouleurs.accent;
      case 'REFUSE': return AppCouleurs.alerte;
      default: return AppCouleurs.texteSecondaire;
    }
  }

  String _libelleKyc(String? s) {
    switch (s) {
      case 'BROUILLON': return 'KYC brouillon';
      case 'EN_REVUE': return 'KYC en revue';
      case 'INFO_MANQUANTE': return 'KYC infos manquantes';
      case 'VALIDE': return 'KYC validé';
      case 'REFUSE': return 'KYC refusé';
      default: return s ?? 'KYC —';
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
              final kyc = p['kycStatut'] as String? ?? '';
              return GestureDetector(
                onTap: () => _showDetailDialog(context, p, _couleurStatut, _libelleStatut, _couleurKyc, _libelleKyc, _charger),
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
                      const SizedBox(height: 4),
                      Text(_libelleKyc(kyc),
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _couleurKyc(kyc))),
                    ],
                  ),
                ),
              );
            },
          ),
    );
  }
}

void _showDetailDialog(
  BuildContext context,
  Map<String, dynamic> p,
  Color Function(String?) couleurStatut,
  String Function(String?) libelleStatut,
  Color Function(String?) couleurKyc,
  String Function(String?) libelleKyc,
  VoidCallback recharger,
) {
  final motifCtrl = TextEditingController();
  bool envoi = false;
  Map<String, dynamic>? kycDetail;
  bool chargementKyc = true;

  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDialogState) {
        if (chargementKyc) {
          chargementKyc = false;
          ApiAdmin.obtenirKyc(p['id'] as String).then((data) {
            if (ctx.mounted) setDialogState(() => kycDetail = data);
          }).catchError((_) {
            if (ctx.mounted) setDialogState(() => kycDetail = {});
          });
        }
        motifCtrl.addListener(() => setDialogState(() {}));
        final kycStatut = (kycDetail?['kycStatut'] ?? p['kycStatut']) as String?;
        final peutReviser = kycStatut == 'EN_REVUE' || kycStatut == 'INFO_MANQUANTE';
        final peutApprouverProfil = p['statut'] == 'EN_ATTENTE_VALIDATION';

        Future<void> ouvrir(String? url) async {
          if (url == null || url.isEmpty) return;
          final uri = Uri.tryParse(url);
          if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
        }

        Widget lien(String label, String? url) => TextButton(
          onPressed: url == null ? null : () => ouvrir(url),
          child: Text(label, style: TextStyle(fontSize: 12, color: url == null ? AppCouleurs.texteSecondaire : AppCouleurs.primaire)),
        );

        return AlertDialog(
        title: Text(p['nomEntreprise'] as String? ?? ''),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _ligneInfo('Catégorie', p['categorie'] as String? ?? ''),
              _ligneInfo('Ville', p['ville'] as String? ?? ''),
              _ligneInfo('Contact', '${(p['utilisateur'] as Map?)?['nom'] ?? ''} • ${(p['utilisateur'] as Map?)?['telephone'] ?? ''}'),
              const SizedBox(height: 8),
              Row(children: [
                const Text('Profil: ', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                Text(libelleStatut(p['statut'] as String?),
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: couleurStatut(p['statut'] as String?))),
              ]),
              Row(children: [
                const Text('KYC: ', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                Text(libelleKyc(kycStatut),
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: couleurKyc(kycStatut))),
              ]),
              if (kycDetail != null) ...[
                const SizedBox(height: 8),
                _ligneInfo('Pièce', '${kycDetail!['pieceIdentiteType'] ?? '—'} ${kycDetail!['pieceIdentiteNumero'] ?? ''}'),
                _ligneInfo('RCCM', kycDetail!['rccm'] as String? ?? '—'),
                _ligneInfo('NIF', kycDetail!['nif'] as String? ?? '—'),
                Wrap(children: [
                  lien('Recto', kycDetail!['pieceIdentiteRectoUrl'] as String?),
                  lien('Verso', kycDetail!['pieceIdentiteVersoUrl'] as String?),
                  lien('Selfie', kycDetail!['selfieUrl'] as String?),
                  lien('RCCM doc', kycDetail!['documentRccmUrl'] as String?),
                  lien('NIF doc', kycDetail!['documentNifUrl'] as String?),
                ]),
              ],
              if ((kycDetail?['kycMotifRejet'] ?? p['motifRejet']) != null) ...[
                const SizedBox(height: 8),
                Text('Motif: ${kycDetail?['kycMotifRejet'] ?? p['motifRejet']}',
                  style: const TextStyle(fontSize: 12, color: AppCouleurs.alerte)),
              ],
              if (peutReviser || peutApprouverProfil) ...[
                const SizedBox(height: 12),
                TextField(
                  controller: motifCtrl,
                  decoration: const InputDecoration(labelText: 'Motif (infos / refus)', border: OutlineInputBorder()),
                  maxLines: 2,
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Fermer')),
          if (peutReviser) ...[
            ElevatedButton(
              onPressed: envoi ? null : () async {
                setDialogState(() => envoi = true);
                try {
                  await ApiAdmin.reviserKyc(prestataireId: p['id'] as String, decision: 'VALIDER');
                  if (ctx.mounted) {
                    Navigator.pop(ctx);
                    ToastWidget.show(ctx, 'KYC validé — profil activé.', type: 'succes');
                    recharger();
                  }
                } catch (e) {
                  if (ctx.mounted) ToastWidget.show(ctx, e.toString(), type: 'erreur');
                } finally {
                  if (ctx.mounted) setDialogState(() => envoi = false);
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppCouleurs.succes, foregroundColor: AppCouleurs.blanc),
              child: const Text('Valider KYC'),
            ),
            ElevatedButton(
              onPressed: envoi || motifCtrl.text.trim().isEmpty ? null : () async {
                setDialogState(() => envoi = true);
                try {
                  await ApiAdmin.reviserKyc(
                    prestataireId: p['id'] as String,
                    decision: 'INFO_MANQUANTE',
                    motif: motifCtrl.text.trim(),
                  );
                  if (ctx.mounted) {
                    Navigator.pop(ctx);
                    ToastWidget.show(ctx, 'Demande d\'infos envoyée.', type: 'succes');
                    recharger();
                  }
                } catch (e) {
                  if (ctx.mounted) ToastWidget.show(ctx, e.toString(), type: 'erreur');
                } finally {
                  if (ctx.mounted) setDialogState(() => envoi = false);
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppCouleurs.avertissement, foregroundColor: AppCouleurs.blanc),
              child: const Text('Infos'),
            ),
            ElevatedButton(
              onPressed: envoi || motifCtrl.text.trim().isEmpty ? null : () async {
                setDialogState(() => envoi = true);
                try {
                  await ApiAdmin.reviserKyc(
                    prestataireId: p['id'] as String,
                    decision: 'REFUSER',
                    motif: motifCtrl.text.trim(),
                  );
                  if (ctx.mounted) {
                    Navigator.pop(ctx);
                    ToastWidget.show(ctx, 'KYC refusé.', type: 'succes');
                    recharger();
                  }
                } catch (e) {
                  if (ctx.mounted) ToastWidget.show(ctx, e.toString(), type: 'erreur');
                } finally {
                  if (ctx.mounted) setDialogState(() => envoi = false);
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppCouleurs.alerte, foregroundColor: AppCouleurs.blanc),
              child: const Text('Refuser'),
            ),
          ],
          if (peutApprouverProfil)
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
              child: const Text('Approuver'),
            ),
        ],
        );
      },
    ),
  );
}

Widget _ligneInfo(String label, String valeur) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: RichText(
      text: TextSpan(
        style: const TextStyle(fontSize: 13, color: AppCouleurs.texte),
        children: [
          TextSpan(text: '$label: ', style: const TextStyle(fontWeight: FontWeight.w600)),
          TextSpan(text: valeur),
        ],
      ),
    ),
  );
}
