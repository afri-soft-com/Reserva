import 'dart:async';
import 'package:flutter/material.dart';
import '../theme.dart';
import '../services/api_notifications.dart';

class BadgeNotification extends StatefulWidget {
  final Widget child;
  final Color? couleur;
  const BadgeNotification({super.key, required this.child, this.couleur});

  @override
  State<BadgeNotification> createState() => _BadgeNotificationState();
}

class _BadgeNotificationState extends State<BadgeNotification> {
  int _compteur = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _charger();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _charger());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _charger() async {
    try {
      final c = await ApiNotifications.compteur();
      if (mounted) setState(() => _compteur = c);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Badge(
      isLabelVisible: _compteur > 0,
      label: Text('$_compteur', style: const TextStyle(fontSize: 10, color: AppCouleurs.blanc)),
      backgroundColor: widget.couleur ?? AppCouleurs.alerte,
      child: widget.child,
    );
  }
}
