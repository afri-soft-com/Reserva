import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import '../theme.dart';

class ConnectivityBanner extends StatefulWidget {
  final Widget child;
  const ConnectivityBanner({super.key, required this.child});

  @override
  State<ConnectivityBanner> createState() => _ConnectivityBannerState();
}

class _ConnectivityBannerState extends State<ConnectivityBanner> {
  bool _horsLigne = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _verifier();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _verifier());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _verifier() async {
    try {
      final result = await InternetAddress.lookup('google.com').timeout(const Duration(seconds: 3));
      if (mounted && result.isNotEmpty && result[0].rawAddress.isNotEmpty) {
        if (_horsLigne) setState(() => _horsLigne = false);
      }
    } catch (_) {
      if (mounted && !_horsLigne) setState(() => _horsLigne = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_horsLigne)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
            color: AppCouleurs.alerte,
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.wifi_off, size: 14, color: Colors.white),
                SizedBox(width: 8),
                Text('Aucune connexion Internet', style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        Expanded(child: widget.child),
      ],
    );
  }
}
