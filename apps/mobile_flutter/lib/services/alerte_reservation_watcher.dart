import 'dart:async';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'api_notifications.dart';
import 'socket_service.dart';
import 'son_alerte_reserva.dart';

/// Écoute les nouvelles réservations (socket + polling) et joue le son Reserva.
class AlerteReservationWatcher {
  static final AlerteReservationWatcher _instance = AlerteReservationWatcher._();
  factory AlerteReservationWatcher() => _instance;
  AlerteReservationWatcher._();

  final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();
  StreamSubscription? _socketSub;
  Timer? _poll;
  bool _demarre = false;
  bool _localPret = false;
  String? _dernierIdVu;
  final Set<String> _dejaAlerte = {};

  Future<void> demarrer() async {
    if (_demarre) return;
    _demarre = true;
    await SonAlerteService.initialiser();
    await _initLocalNotifs();

    _socketSub = SocketService().nouvellesReservations.listen(_surEvenementSocket);

    // Filet si le socket rate (app en arrière-plan / réseau)
    _poll = Timer.periodic(const Duration(seconds: 25), (_) => _verifierInbox());
    await _verifierInbox(initial: true);
  }

  Future<void> arreter() async {
    _demarre = false;
    await _socketSub?.cancel();
    _socketSub = null;
    _poll?.cancel();
    _poll = null;
  }

  Future<void> _initLocalNotifs() async {
    if (_localPret) return;
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestSoundPermission: true,
    );
    await _local.initialize(
      const InitializationSettings(android: android, iOS: ios),
    );
    final androidPlugin = _local
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.requestNotificationsPermission();
    await androidPlugin?.createNotificationChannel(
      const AndroidNotificationChannel(
        'reserva_nouvelles_reservations',
        'Nouvelles réservations',
        description: 'Alertes sonores Reserva pour les nouvelles réservations',
        importance: Importance.high,
        playSound: true,
      ),
    );
    _localPret = true;
  }

  void _surEvenementSocket(Map<String, dynamic> data) {
    final id = data['reservationId']?.toString() ?? data['numero']?.toString() ?? '';
    if (id.isEmpty || _dejaAlerte.contains(id)) return;
    _dejaAlerte.add(id);
    _alerter(
      titre: data['titre']?.toString() ?? 'Nouvelle réservation',
      message: data['message']?.toString() ?? 'Une nouvelle réservation est arrivée.',
      reservationId: data['reservationId']?.toString(),
    );
  }

  Future<void> _verifierInbox({bool initial = false}) async {
    try {
      final items = await ApiNotifications.lister(nonLues: true);
      NotificationItem? cible;
      for (final n in items) {
        final titre = n.titre.toLowerCase();
        if (titre.contains('nouvelle réservation') || titre.contains('nouvelle reservation')) {
          cible = n;
          break;
        }
      }
      if (cible == null) return;
      if (initial) {
        _dernierIdVu = cible.id;
        return;
      }
      if (cible.id == _dernierIdVu || _dejaAlerte.contains(cible.id)) return;
      _dernierIdVu = cible.id;
      _dejaAlerte.add(cible.id);
      await _alerter(
        titre: cible.titre,
        message: cible.message,
        reservationId: cible.reservationId,
      );
    } catch (_) {
      /* silencieux */
    }
  }

  Future<void> _alerter({
    required String titre,
    required String message,
    String? reservationId,
  }) async {
    await SonAlerteService.jouer();
    if (!_localPret) return;
    try {
      await _local.show(
        reservationId?.hashCode ?? DateTime.now().millisecondsSinceEpoch % 100000,
        titre,
        message,
        NotificationDetails(
          android: AndroidNotificationDetails(
            'reserva_nouvelles_reservations',
            'Nouvelles réservations',
            channelDescription: 'Alertes sonores Reserva pour les nouvelles réservations',
            importance: Importance.high,
            priority: Priority.high,
            playSound: true,
            enableVibration: true,
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentSound: true,
            presentBadge: true,
          ),
        ),
        payload: reservationId,
      );
    } catch (_) {
      /* permissions */
    }
  }
}
