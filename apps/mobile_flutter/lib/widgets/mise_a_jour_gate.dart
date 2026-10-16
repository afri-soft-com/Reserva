import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../app_flavor.dart';
import '../services/api_app_versions.dart';
import '../theme.dart';
import '../utils/comparer_versions.dart';

/// Intervalle de relecture des seuils pendant l'utilisation (garde-fou CI).
const Duration kIntervallePollMiseAJour = Duration(minutes: 2);

/// Soft banner + force blocking overlay selon /api/app/versions.
/// Relit les seuils en cours d'utilisation ; réaffiche si minSoft augmente.
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
  bool _chargementEnCours = false;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _charger();
    // Poll fréquent : bannière dès qu'une MAJ est publiée côté API, sans relancer l'app.
    _poll = Timer.periodic(kIntervallePollMiseAJour, (_) => _charger(silencieux: true));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _poll?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _charger(silencieux: true);
    }
  }

  Future<void> _appliquerConfig({
    required String installee,
    required Map<String, dynamic> cfg,
  }) async {
    final android = cfg['storeUrlAndroid'] as String?;
    final ios = cfg['storeUrlIos'] as String?;
    final minSoft = cfg['minSoft'] as String? ?? '1.0.1';
    final minForce = cfg['minForce'] as String? ?? '1.0.0';
    final precedentSoft = _minSoft;

    if (!mounted) return;
    setState(() {
      _installee = installee;
      _minSoft = minSoft;
      _minForce = minForce;
      _storeUrl = Platform.isIOS ? ios : android;
      _charge = false;
      final mode = decideModeMiseAJour(
        versionInstallee: installee,
        minSoft: minSoft,
        minForce: minForce,
      );
      // Nouvelle publication (minSoft ↑) ou plus de besoin de MAJ → réafficher / reset dismiss.
      if (mode == 'none' ||
          mode == 'force' ||
          (precedentSoft != null && comparerVersions(minSoft, precedentSoft) > 0)) {
        _dismissSoft = false;
      }
    });
  }

  Future<void> _charger({bool silencieux = false}) async {
    if (_chargementEnCours) return;
    _chargementEnCours = true;
    try {
      final info = await PackageInfo.fromPlatform();
      final versions = await ApiAppVersions.lire();
      final canal = AppFlavorConfig.estPrestataire ? 'pro' : 'client';
      final cfg = Map<String, dynamic>.from(versions[canal] as Map? ?? {});
      await _appliquerConfig(installee: info.version, cfg: cfg);
    } catch (_) {
      if (!silencieux) {
        await Future<void>.delayed(const Duration(seconds: 2));
        if (!mounted) return;
        try {
          final info = await PackageInfo.fromPlatform();
          final versions = await ApiAppVersions.lire();
          final canal = AppFlavorConfig.estPrestataire ? 'pro' : 'client';
          final cfg = Map<String, dynamic>.from(versions[canal] as Map? ?? {});
          await _appliquerConfig(installee: info.version, cfg: cfg);
          return;
        } catch (_) {
          /* ignore */
        }
      }
      if (mounted && _charge) setState(() => _charge = false);
    } finally {
      _chargementEnCours = false;
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

  Widget _banniereSoft() {
    return Material(
      elevation: 12,
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
    );
  }

  Widget _ecranForce() {
    return Material(
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
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_charge) return widget.child;

    final corps = _soft
        ? Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _banniereSoft(),
              Expanded(child: widget.child),
            ],
          )
        : widget.child;

    return Stack(
      fit: StackFit.expand,
      children: [
        corps,
        if (_force) Positioned.fill(child: _ecranForce()),
      ],
    );
  }
}
