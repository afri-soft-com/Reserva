import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../i18n.dart';
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
    try {
      await ApiNotifications.marquerLue(id);
      if (!mounted) return;
      setState(() {
        _notifications = _notifications.map((n) => n.id == id ? NotificationItem(
          id: n.id, titre: n.titre, message: n.message, type: n.type,
          lu: true, reservationId: n.reservationId, creeLe: n.creeLe,
        ) : n).toList();
      });
    } catch (_) {
      if (mounted) _charger();
    }
  }

  Future<void> _marquerToutesLues() async {
    try {
      await ApiNotifications.marquerToutesLues();
      if (!mounted) return;
      setState(() {
        _notifications = _notifications.map((n) => NotificationItem(
          id: n.id, titre: n.titre, message: n.message, type: n.type,
          lu: true, reservationId: n.reservationId, creeLe: n.creeLe,
        )).toList();
      });
    } catch (_) {
      if (mounted) _charger();
    }
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
    String patron;
    if (diff.inMinutes < 1) {
      return AppTraductions.t('tempsInstant');
    } else if (diff.inMinutes < 60) {
      patron = AppTraductions.t('tempsMinutes');
      return patron.replaceAll('%s', '${diff.inMinutes}');
    } else if (diff.inHours < 24) {
      patron = AppTraductions.t('tempsHeures');
      return patron.replaceAll('%s', '${diff.inHours}');
    }
    patron = AppTraductions.t('tempsJours');
    return patron.replaceAll('%s', '${diff.inDays}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: Text(AppTraductions.t('notifications')),
        actions: [
          if (_notifications.any((n) => !n.lu))
            TextButton(onPressed: _marquerToutesLues, child: Text(AppTraductions.t('toutLire'), style: const TextStyle(fontSize: 13))),
        ],
      ),
      body: _chargement
        ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
        : _notifications.isEmpty
          ? EcranVide(
              icone: Icons.notifications_off,
              message: AppTraductions.t('aucuneNotification'),
              sousTitre: AppTraductions.t('aucuneNotificationSousTitre'),
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
                  return Dismissible(
                    key: ValueKey(n.id),
                    direction: DismissDirection.endToStart,
                    background: Container(
                      alignment: Alignment.centerRight,
                      padding: const EdgeInsets.only(right: 20),
                      decoration: BoxDecoration(
                        color: AppCouleurs.alerte,
                        borderRadius: BorderRadius.circular(AppRayons.carte),
                      ),
                      child: const Icon(Icons.delete_outline, color: AppCouleurs.blanc),
                    ),
                    onDismissed: (_) {
                      setState(() => _notifications.removeWhere((x) => x.id == n.id));
                      ApiNotifications.supprimer(n.id).catchError((_) {});
                    },
                    child: Material(
                      color: n.lu ? AppCouleurs.blanc : AppCouleurs.primaireClair,
                      borderRadius: BorderRadius.circular(AppRayons.carte),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(AppRayons.carte),
                        onTap: () async {
                          if (!n.lu) await _marquerLue(n.id);
                          final reservationId = n.reservationId;
                          if (reservationId == null) return;
                          if (!context.mounted) return;
                          await context.push('/reservation/$reservationId');
                          if (mounted) _charger();
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
                    ),
                  );
                },
              ),
            ),
    );
  }
}
