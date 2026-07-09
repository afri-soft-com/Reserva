import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../services/api_notifications.dart';
import '../../widgets/squelette.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<NotificationItem> _notifications = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final data = await ApiNotifications.lister();
      if (mounted) setState(() => _notifications = data);
    } catch (_) {
      if (mounted) setState(() => _notifications = []);
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _marquerLue(String id) async {
    await ApiNotifications.marquerLue(id);
    setState(() {
      _notifications = _notifications.map((n) => n.id == id ? NotificationItem(
        id: n.id, titre: n.titre, message: n.message, type: n.type,
        lu: true, reservationId: n.reservationId, creeLe: n.creeLe,
      ) : n).toList();
    });
  }

  Future<void> _marquerToutesLues() async {
    await ApiNotifications.marquerToutesLues();
    setState(() {
      _notifications = _notifications.map((n) => NotificationItem(
        id: n.id, titre: n.titre, message: n.message, type: n.type,
        lu: true, reservationId: n.reservationId, creeLe: n.creeLe,
      )).toList();
    });
  }

  IconData _iconeType(String type) {
    switch (type) {
      case 'RESERVATION': return Icons.calendar_today;
      case 'PAIEMENT': return Icons.payment;
      case 'RAPPEL': return Icons.notifications_active;
      case 'ANNULATION': return Icons.cancel;
      case 'AVIS': return Icons.star;
      default: return Icons.notifications;
    }
  }

  Color _couleurType(String type) {
    switch (type) {
      case 'RESERVATION': return AppCouleurs.primaire;
      case 'PAIEMENT': return AppCouleurs.succes;
      case 'RAPPEL': return AppCouleurs.avertissement;
      case 'ANNULATION': return AppCouleurs.alerte;
      case 'AVIS': return AppCouleurs.accent;
      default: return AppCouleurs.texteSecondaire;
    }
  }

  String _tempsDepuis(String iso) {
    final diff = DateTime.now().difference(DateTime.parse(iso));
    if (diff.inMinutes < 1) return 'À l\'instant';
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours}h';
    return 'Il y a ${diff.inDays}j';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (_notifications.any((n) => !n.lu))
            TextButton(onPressed: _marquerToutesLues, child: const Text('Tout lire', style: TextStyle(fontSize: 13))),
        ],
      ),
      body: _chargement
        ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
        : _notifications.isEmpty
          ? EcranVide(
              icone: Icons.notifications_off,
              message: 'Aucune notification',
              sousTitre: 'Vous serez notifié lors des réservations et paiements.',
            )
          : RefreshIndicator(
              onRefresh: _charger,
              color: AppCouleurs.primaire,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: _notifications.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (ctx, i) {
                  final n = _notifications[i];
                  return Material(
                    color: n.lu ? AppCouleurs.blanc : AppCouleurs.primaireClair,
                    borderRadius: BorderRadius.circular(AppRayons.carte),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppRayons.carte),
                      onTap: () {
                        if (!n.lu) _marquerLue(n.id);
                        if (n.reservationId != null) {
                          context.push('/reservation/${n.reservationId}');
                        }
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: _couleurType(n.type).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(_iconeType(n.type), size: 20, color: _couleurType(n.type)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(n.titre,
                                          style: TextStyle(
                                            fontSize: 14, fontWeight: n.lu ? FontWeight.w500 : FontWeight.w700,
                                            color: AppCouleurs.texte,
                                          )),
                                      ),
                                      Text(_tempsDepuis(n.creeLe),
                                        style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(n.message,
                                    style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire),
                                    maxLines: 2, overflow: TextOverflow.ellipsis),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
