import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../app_flavor.dart';
import '../services/api_app_versions.dart';
import '../services/app_store_live.dart';
import '../theme.dart';
import '../utils/comparer_versions.dart';

/// Intervalle de relecture des seuils pendant l'utilisation.
const Duration kIntervallePollMiseAJour = Duration(minutes: 1);

/// Soft banner + force blocking selon /api/app/versions.
class MiseAJourGate extends StatefulWidget {
  final Widget child;
  const MiseAJourGate({super.key, required this.child});

  @override
  State<MiseAJourGate> createState() => _MiseAJourGateState();
}

class _MiseAJourGateState extends State<MiseAJourGate> with WidgetsBindingObserver {
  String? _installee;
  String? _buildInstallee;
  String? _minSoft;
  String? _minSoftBuild;
  String? _minForce;
  String? _storeUrl;
  /// iOS : version téléchargeable sur l'App Store (null = inconnue).
  String? _versionStoreIos;
  bool _dismissSoft = false;
  bool _pret = false;
  bool _chargementEnCours = false;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _charger();
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
      // Ne pas réafficher une soft déjà fermée (« Plus tard ») :
      // elle ne revient que si minSoft augmente (_appliquerConfig).
      _charger(silencieux: true);
    }
  }

  void _appliquerConfig({
    required String installee,
    required String buildInstallee,
    required Map<String, dynamic> cfg,
  }) {
    final android = cfg['storeUrlAndroid']?.toString();
    final ios = cfg['storeUrlIos']?.toString();
    final minSoft = cfg['minSoft']?.toString() ?? '1.0.1';
    final minForce = cfg['minForce']?.toString() ?? '1.0.0';
    // Build publiée par la CI pour CETTE plateforme (les stores publient séparément).
    final minSoftBuild =
        cfg[Platform.isIOS ? 'minSoftBuildIos' : 'minSoftBuildAndroid']?.toString();
    final precedentSoft = _minSoft;
    final precedentBuild = lireBuild(_minSoftBuild);

    if (!mounted) return;
    setState(() {
      _installee = installee;
      _buildInstallee = buildInstallee;
      _minSoft = minSoft;
      _minSoftBuild = minSoftBuild;
      _minForce = minForce;
      _storeUrl = Platform.isIOS ? ios : android;
      _pret = true;
      final mode = decideModeMiseAJour(
        versionInstallee: installee,
        minSoft: minSoft,
        minForce: minForce,
        buildInstallee: buildInstallee,
        minSoftBuild: minSoftBuild,
      );
      // « Plus tard » ne vaut que pour la publication vue : une nouvelle
      // version OU une nouvelle build publiée réaffiche la bannière.
      final nouvellePublication = precedentSoft != null &&
          (comparerVersions(minSoft, precedentSoft) > 0 ||
              (comparerVersions(minSoft, precedentSoft) == 0 &&
                  lireBuild(minSoftBuild) > precedentBuild));
      if (mode == 'none' || mode == 'force' || nouvellePublication) {
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
      final raw = versions[canal];
      if (raw is! Map) {
        throw Exception('Canal $canal absent de /app/versions');
      }
      _appliquerConfig(
        installee: info.version,
        buildInstallee: info.buildNumber,
        cfg: Map<String, dynamic>.from(raw),
      );
      if (Platform.isIOS && _mode == 'soft') {
        final live = await AppStoreLive.version(info.packageName);
        if (mounted && live != _versionStoreIos) setState(() => _versionStoreIos = live);
      }
    } catch (_) {
      if (!silencieux) {
        await Future<void>.delayed(const Duration(seconds: 2));
        if (!mounted) return;
        try {
          final info = await PackageInfo.fromPlatform();
          final versions = await ApiAppVersions.lire();
          final canal = AppFlavorConfig.estPrestataire ? 'pro' : 'client';
          final raw = versions[canal];
          if (raw is Map) {
            _appliquerConfig(
              installee: info.version,
              buildInstallee: info.buildNumber,
              cfg: Map<String, dynamic>.from(raw),
            );
          }
        } catch (_) {
          /* conserve la dernière config connue — ne pas masquer une bannière déjà visible */
        }
      }
      // Si on n'a jamais eu de config, marquer prêt pour ne pas bloquer l'UI.
      if (mounted && !_pret) setState(() => _pret = true);
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
      buildInstallee: _buildInstallee,
      minSoftBuild: _minSoftBuild,
    );
  }

  bool get _force => _mode == 'force';

  /// iOS : la CI publie le seuil dès l'envoi à Apple, mais la build n'est
  /// téléchargeable qu'après la revue. Tant que l'App Store ne propose rien de
  /// plus récent que la version installée, la bannière renverrait vers une fiche
  /// sans mise à jour : on attend. Version store inconnue → comportement normal.
  bool get _storeProposeMaj {
    if (!Platform.isIOS || _versionStoreIos == null || _installee == null) return true;
    return comparerVersions(_versionStoreIos!, _installee!) > 0;
  }

  bool get _soft => !_dismissSoft && _mode == 'soft' && _storeProposeMaj;

  String get _libelleSoft {
    // Même nom de version : on annonce la nouvelle build, pas « v1.0.10 → 1.0.10 ».
    if (_installee != null && _minSoft != null && comparerVersions(_installee!, _minSoft!) == 0) {
      return "Nouvelle version de l'app disponible";
    }
    return 'Mise à jour disponible (v$_installee → $_minSoft)';
  }

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
      elevation: 16,
      color: const Color(0xFF1A56DB),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
          child: Row(
            children: [
              const Icon(Icons.system_update_alt, color: Colors.white, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _libelleSoft,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                  ),
                ),
              ),
              TextButton(
                onPressed: _ouvrirStore,
                child: const Text(
                  'Mettre à jour',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                ),
              ),
              IconButton(
                tooltip: 'Plus tard',
                icon: const Icon(Icons.close, color: Colors.white70, size: 20),
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
    // Bannière soft dans une Column (pas seulement Overlay) : toujours visible
    // au-dessus du contenu, y compris AppBar des écrans enfants.
    return Column(
      children: [
        if (_pret && _soft) _banniereSoft(),
        Expanded(
          child: Stack(
            fit: StackFit.expand,
            children: [
              widget.child,
              if (_pret && _force) Positioned.fill(child: _ecranForce()),
            ],
          ),
        ),
      ],
    );
  }
}
