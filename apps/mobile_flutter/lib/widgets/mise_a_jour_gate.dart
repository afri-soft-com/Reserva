import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../app_flavor.dart';
import '../services/api_app_versions.dart';
import '../theme.dart';
import '../utils/comparer_versions.dart';

/// Soft banner + force blocking overlay selon /api/app/versions.
/// La bannière disparaît dès que la version installée ≥ minSoft (après MAJ store).
class MiseAJourGate extends StatefulWidget {
  final Widget child;
  const MiseAJourGate({super.key, required this.child});

  @override
  State<MiseAJourGate> createState() => _MiseAJourGateState();
}

class _MiseAJourGateState extends State<MiseAJourGate> with WidgetsBindingObserver {
  String? _installee;
  String? _minSoft;
  String? _minForce;
  String? _storeUrl;
  bool _dismissSoft = false;
  bool _charge = true;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _charger();
    _poll = Timer.periodic(const Duration(minutes: 30), (_) => _charger(silencieux: true));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _poll?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Au retour du store / de l'arrière-plan : relecture version installée.
    if (state == AppLifecycleState.resumed) {
      _charger(silencieux: true);
    }
  }

  Future<void> _charger({bool silencieux = false}) async {
    try {
      final info = await PackageInfo.fromPlatform();
      final versions = await ApiAppVersions.lire();
      final canal = AppFlavorConfig.estPrestataire ? 'pro' : 'client';
      final cfg = Map<String, dynamic>.from(versions[canal] as Map? ?? {});
      final android = cfg['storeUrlAndroid'] as String?;
      final ios = cfg['storeUrlIos'] as String?;
      final installee = info.version;
      final minSoft = cfg['minSoft'] as String? ?? '1.0.0';
      final minForce = cfg['minForce'] as String? ?? '0.9.0';

      if (!mounted) return;
      setState(() {
        _installee = installee;
        _minSoft = minSoft;
        _minForce = minForce;
        _storeUrl = Platform.isIOS ? ios : android;
        _charge = false;
        // Dès que la MAJ est faite, la bannière disparaît (même si dismissée avant).
        if (decideModeMiseAJour(
              versionInstallee: installee,
              minSoft: minSoft,
              minForce: minForce,
            ) ==
            'none') {
          _dismissSoft = false;
        }
      });
    } catch (_) {
      if (mounted && !silencieux) {
        setState(() => _charge = false);
      } else if (mounted && _charge) {
        setState(() => _charge = false);
      }
    }
  }

  String get _mode {
    if (_installee == null || _minSoft == null || _minForce == null) return 'none';
    return decideModeMiseAJour(
      versionInstallee: _installee!,
      minSoft: _minSoft!,
      minForce: _minForce!,
    );
  }

  bool get _force => _mode == 'force';

  bool get _soft => !_dismissSoft && _mode == 'soft';

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
            top: 0,
            left: 0,
            right: 0,
            child: Material(
              elevation: 6,
              color: const Color(0xFF1A56DB),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      const Icon(Icons.system_update_alt, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Mise à jour disponible (v$_installee → ≥ $_minSoft)',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: _ouvrirStore,
                        child: const Text(
                          'Mettre à jour',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Plus tard',
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
