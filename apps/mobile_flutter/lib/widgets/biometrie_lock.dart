import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_auth.dart';
import '../services/api_client.dart';
import '../theme.dart';
import 'toast.dart';

/// Verrouillage local (biométrie + PIN) quand l'app revient au premier plan.
class BiometrieLockWrapper extends StatefulWidget {
  final Widget child;

  const BiometrieLockWrapper({super.key, required this.child});

  @override
  State<BiometrieLockWrapper> createState() => _BiometrieLockWrapperState();
}

class _BiometrieLockWrapperState extends State<BiometrieLockWrapper>
    with WidgetsBindingObserver {
  bool _verrouille = false;
  bool _modePin = false;
  bool _chargement = false;
  final _pinCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pinCtrl.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      final auth = context.read<AuthProvider>();
      if (auth.estConnecte && auth.biometrieActivee) {
        setState(() {
          _verrouille = true;
          _modePin = false;
          _pinCtrl.clear();
        });
      }
    }
    if (state == AppLifecycleState.resumed && _verrouille && !_modePin) {
      _deverrouillerBiometrie();
    }
  }

  Future<void> _deverrouillerBiometrie() async {
    final auth = context.read<AuthProvider>();
    final ok = await auth.authentifierParBiometrie();
    if (mounted) setState(() => _verrouille = !ok);
  }

  Future<void> _deverrouillerParPin() async {
    final pin = _pinCtrl.text.trim();
    if (pin.length != 4) return;
    final auth = context.read<AuthProvider>();
    final tel = await ApiClient.getDernierTelephone() ?? auth.utilisateur?.telephone;
    if (!mounted) return;
    if (tel == null || tel.isEmpty) {
      ToastWidget.show(context, 'Téléphone inconnu — reconnectez-vous', type: 'erreur');
      return;
    }
    setState(() => _chargement = true);
    try {
      final data = await ApiAuth.connecter(tel, pin);
      if (!mounted) return;
      if (data.containsKey('deuxfaRequis') && data['deuxfaRequis'] == true) {
        await auth.deconnecter();
        if (!mounted) return;
        setState(() => _verrouille = false);
        context.go('/connexion');
        return;
      }
      final token = data['token'] as String?;
      if (token != null) {
        await ApiClient.saveToken(token);
      }
      if (!mounted) return;
      setState(() {
        _verrouille = false;
        _modePin = false;
        _pinCtrl.clear();
      });
    } catch (e) {
      if (!mounted) return;
      ToastWidget.show(
        context,
        e.toString().replaceFirst(RegExp(r'^Exception:\s*'), ''),
        type: 'erreur',
      );
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_verrouille)
          Positioned.fill(
            child: Material(
              color: AppCouleurs.fond,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: _modePin ? _uiPin() : _uiBiometrie(),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _uiBiometrie() {
    return Column(
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
          'Utilisez votre empreinte ou Face ID\npour continuer',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire),
        ),
        const SizedBox(height: 32),
        ElevatedButton.icon(
          onPressed: _deverrouillerBiometrie,
          icon: const Icon(Icons.fingerprint),
          label: const Text('Déverrouiller'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppCouleurs.primaire,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => setState(() => _modePin = true),
          child: Text(
            'Entrer le PIN',
            style: TextStyle(fontWeight: FontWeight.w700, color: AppCouleurs.primaire),
          ),
        ),
        TextButton(
          onPressed: () async {
            await context.read<AuthProvider>().deconnecter();
            if (mounted) {
              setState(() => _verrouille = false);
              context.go('/connexion');
            }
          },
          child: Text(
            'PIN oublié ?',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: AppCouleurs.primaire,
              decoration: TextDecoration.underline,
            ),
          ),
        ),
      ],
    );
  }

  Widget _uiPin() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Entrez votre PIN',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppCouleurs.texte),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _pinCtrl,
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 4,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 28, letterSpacing: 12, fontWeight: FontWeight.w700),
          decoration: InputDecoration(
            counterText: '',
            hintText: '••••',
            filled: true,
            fillColor: AppCouleurs.blanc,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
          onSubmitted: (_) => _deverrouillerParPin(),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _chargement ? null : _deverrouillerParPin,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppCouleurs.primaire,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _chargement
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Déverrouiller', style: TextStyle(fontWeight: FontWeight.w700)),
        ),
        TextButton(
          onPressed: () => setState(() {
            _modePin = false;
            _pinCtrl.clear();
          }),
          child: const Text('Retour à la biométrie'),
        ),
        TextButton(
          onPressed: () async {
            await context.read<AuthProvider>().deconnecter();
            if (mounted) {
              setState(() => _verrouille = false);
              context.go('/reinitialiser-pin');
            }
          },
          child: Text(
            'PIN oublié ?',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: AppCouleurs.primaire,
              decoration: TextDecoration.underline,
            ),
          ),
        ),
      ],
    );
  }
}
