import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';

class BiometrieLockWrapper extends StatefulWidget {
  final Widget child;

  const BiometrieLockWrapper({super.key, required this.child});

  @override
  State<BiometrieLockWrapper> createState() => _BiometrieLockWrapperState();
}

class _BiometrieLockWrapperState extends State<BiometrieLockWrapper>
    with WidgetsBindingObserver {
  bool _verrouille = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      final auth = context.read<AuthProvider>();
      if (auth.estConnecte && auth.biometrieActivee) {
        setState(() => _verrouille = true);
      }
    }
    if (state == AppLifecycleState.resumed && _verrouille) {
      _deverrouiller();
    }
  }

  Future<void> _deverrouiller() async {
    final auth = context.read<AuthProvider>();
    final ok = await auth.authentifierParBiometrie();
    if (mounted) setState(() => _verrouille = !ok);
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_verrouille)
          Positioned.fill(
            child: Container(
              color: AppCouleurs.fond,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.fingerprint, size: 72, color: AppCouleurs.primaire.withValues(alpha: 0.6)),
                    const SizedBox(height: 24),
                    Text(
                      'Déverrouillez RESERVA',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppCouleurs.texte),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Utilisez votre empreinte ou FaceID\npour continuer',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire),
                    ),
                    const SizedBox(height: 32),
                    ElevatedButton.icon(
                      onPressed: _deverrouiller,
                      icon: const Icon(Icons.fingerprint),
                      label: const Text('Déverrouiller'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppCouleurs.primaire,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
