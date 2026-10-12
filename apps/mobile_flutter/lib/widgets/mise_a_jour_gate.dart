import 'dart:io';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../app_flavor.dart';
import '../services/api_app_versions.dart';
import '../theme.dart';

/// Compare semver a.b.c — retourne negatif si a plus petit, 0 si egal, positif sinon.
int comparerVersions(String a, String b) {
  List<int> parts(String v) =>
      v.split(RegExp(r'[^0-9]+')).where((s) => s.isNotEmpty).map(int.parse).toList();
  final pa = parts(a);
  final pb = parts(b);
  for (var i = 0; i < 3; i++) {
    final x = i < pa.length ? pa[i] : 0;
    final y = i < pb.length ? pb[i] : 0;
    if (x != y) return x.compareTo(y);
  }
  return 0;
}

/// Soft banner + force blocking overlay selon /api/app/versions.
class MiseAJourGate extends StatefulWidget {
  final Widget child;
  const MiseAJourGate({super.key, required this.child});

  @override
  State<MiseAJourGate> createState() => _MiseAJourGateState();
}

class _MiseAJourGateState extends State<MiseAJourGate> {
  String? _installee;
  String? _minSoft;
  String? _minForce;
  String? _storeUrl;
  bool _dismissSoft = false;
  bool _charge = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final versions = await ApiAppVersions.lire();
      final canal = AppFlavorConfig.estPrestataire ? 'pro' : 'client';
      final cfg = Map<String, dynamic>.from(versions[canal] as Map? ?? {});
      final android = cfg['storeUrlAndroid'] as String?;
      final ios = cfg['storeUrlIos'] as String?;
      setState(() {
        _installee = info.version;
        _minSoft = cfg['minSoft'] as String? ?? '1.0.0';
        _minForce = cfg['minForce'] as String? ?? '0.9.0';
        _storeUrl = Platform.isIOS ? ios : android;
        _charge = false;
      });
    } catch (_) {
      if (mounted) setState(() => _charge = false);
    }
  }

  bool get _force {
    if (_installee == null || _minForce == null) return false;
    return comparerVersions(_installee!, _minForce!) < 0;
  }

  bool get _soft {
    if (_dismissSoft || _force) return false;
    if (_installee == null || _minSoft == null) return false;
    return comparerVersions(_installee!, _minSoft!) < 0;
  }

  Future<void> _ouvrirStore() async {
    final url = _storeUrl;
    if (url == null || url.isEmpty) return;
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_charge) return widget.child;

    return Stack(
      fit: StackFit.expand,
      children: [
        widget.child,
        if (_soft)
          Positioned(
            top: MediaQuery.paddingOf(context).top,
            left: 0,
            right: 0,
            child: Material(
              color: const Color(0xFF1A56DB),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Une mise à jour est disponible.',
                          style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                      TextButton(
                        onPressed: _ouvrirStore,
                        child: const Text('Mettre à jour', style: TextStyle(color: Colors.white)),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white70, size: 18),
                        onPressed: () => setState(() => _dismissSoft = true),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        if (_force)
          Positioned.fill(
            child: Material(
              color: Colors.black.withValues(alpha: 0.92),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.system_update, size: 64, color: Colors.white),
                      const SizedBox(height: 16),
                      const Text(
                        'Mise à jour obligatoire',
                        style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Votre version ($_installee) n\'est plus supportée.\nInstallez au moins $_minForce.',
                        style: const TextStyle(color: Colors.white70, height: 1.4),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      FilledButton(
                        style: FilledButton.styleFrom(backgroundColor: AppCouleurs.primaire),
                        onPressed: _ouvrirStore,
                        child: const Text('Ouvrir le store'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
