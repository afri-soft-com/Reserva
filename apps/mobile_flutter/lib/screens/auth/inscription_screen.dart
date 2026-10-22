import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../services/api_auth.dart';
import '../../providers/auth_provider.dart';
import '../../models/models.dart';
import '../../theme.dart';
import '../../app_flavor.dart';
import '../../widgets/champ.dart';
import '../../widgets/otp_champ.dart';
import '../../widgets/toast.dart';

class InscriptionScreen extends StatefulWidget {
  const InscriptionScreen({super.key});

  @override
  State<InscriptionScreen> createState() => _InscriptionScreenState();
}

class _InscriptionScreenState extends State<InscriptionScreen> {
  /// FORMULAIRE (+ CGU) → OTP → PIN  |  téléphone prérempli depuis /bienvenue
  String _etape = 'FORMULAIRE';
  bool _chargement = false;
  bool _accepteCgu = false;
  bool _telDepuisExtra = false;
  final _nomCtrl = TextEditingController();
  final _telephoneCtrl = TextEditingController(text: '+243');
  final _codeParrainageCtrl = TextEditingController();
  final _codeOtpCtrl = TextEditingController();
  final _pinCtrl = TextEditingController();
  final _confirmationPinCtrl = TextEditingController();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_telDepuisExtra) return;
    final extra = GoRouterState.of(context).extra;
    if (extra is String && extra.trim().isNotEmpty) {
      _telephoneCtrl.text = extra.trim();
      _telDepuisExtra = true;
    } else if (extra is Map) {
      final tel = extra['telephone']?.toString();
      if (tel != null && tel.isNotEmpty) _telephoneCtrl.text = tel;
      if (extra['etape'] == 'PIN') _etape = 'PIN';
      _telDepuisExtra = true;
    }
  }

  @override
  void dispose() {
    _nomCtrl.dispose();
    _telephoneCtrl.dispose();
    _codeParrainageCtrl.dispose();
    _codeOtpCtrl.dispose();
    _pinCtrl.dispose();
    _confirmationPinCtrl.dispose();
    super.dispose();
  }

  Future<void> _gererFormulaire() async {
    if (_telephoneCtrl.text.trim().length < 10) {
      ToastWidget.show(context, 'Numéro de téléphone invalide', type: 'erreur');
      return;
    }
    if (_nomCtrl.text.trim().length < 2) {
      ToastWidget.show(context, 'Indiquez votre nom complet', type: 'erreur');
      return;
    }
    if (!_accepteCgu) {
      ToastWidget.show(context, 'Veuillez accepter les CGU pour continuer', type: 'erreur');
      return;
    }
    setState(() => _chargement = true);
    try {
      // Hash + écran OTP d'abord → SMS Retriever écoute avant l'arrivée du SMS (sans permission).
      final smsHash = await obtenirSmsAppHash();
      if (!mounted) return;
      setState(() => _etape = 'OTP');
      await Future<void>.delayed(const Duration(milliseconds: 300));
      final data = await ApiAuth.inscrire(
        _telephoneCtrl.text.trim(),
        _nomCtrl.text.trim(),
        codeParrainage: _codeParrainageCtrl.text.trim(),
        role: AppFlavorConfig.roleApi,
        smsAppHash: smsHash,
      );
      if (!mounted) return;
      if (data['pinRequis'] == true) {
        setState(() => _etape = 'PIN');
        ToastWidget.show(context, 'Numéro déjà vérifié. Créez votre PIN.', type: 'succes');
        return;
      }
      final smsOk = data['smsEnvoye'] != false;
      ToastWidget.show(
        context,
        smsOk
            ? 'Code SMS envoyé (une seule fois). Ensuite, connexion par PIN uniquement.'
            : 'Service SMS momentanément indisponible. Saisissez le code dès réception, ou réessayez dans une minute.',
        type: smsOk ? 'succes' : 'erreur',
      );
    } catch (e) {
      final msg = _msgErreur(e);
      // Compte créé mais OTP non reçu / inscription inachevée → renvoyer le SMS
      final deja = msg.toLowerCase().contains('déjà inscrit') ||
          msg.toLowerCase().contains('deja inscrit') ||
          msg.toLowerCase().contains('déjà associé');
      final smsDown = msg.toLowerCase().contains('sms') &&
          (msg.toLowerCase().contains('indisponible') ||
              msg.toLowerCase().contains('impossible d\'envoyer'));
      if (deja) {
        try {
          final smsHash = await obtenirSmsAppHash();
          if (!mounted) return;
          setState(() => _etape = 'OTP');
          await Future<void>.delayed(const Duration(milliseconds: 300));
          final data = await ApiAuth.renvoyerOtp(_telephoneCtrl.text.trim(), smsAppHash: smsHash);
          if (mounted) {
            final smsOk = data['smsEnvoye'] != false;
            ToastWidget.show(
              context,
              smsOk
                  ? 'Nouveau code SMS envoyé.'
                  : 'Service SMS momentanément indisponible. Saisissez le code dès réception.',
              type: smsOk ? 'succes' : 'erreur',
            );
          }
          return;
        } catch (e2) {
          if (mounted) {
            // Garde l'écran OTP si le compte existe : l'utilisateur peut encore saisir un code.
            setState(() => _etape = 'OTP');
            ToastWidget.show(context, _msgErreur(e2), type: 'erreur');
          }
          return;
        }
      }
      if (mounted) {
        // Panne SMS : rester sur OTP pour saisir un code reçu / communiqué par support.
        setState(() => _etape = smsDown ? 'OTP' : 'FORMULAIRE');
        ToastWidget.show(context, msg, type: 'erreur');
      }
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _msgErreur(Object e) {
    var s = e.toString();
    // ApiClient wrappe en Exception('…') — retirer le préfixe pour l'UI
    s = s.replaceFirst(RegExp(r'^Exception:\s*'), '');
    s = s.replaceFirst(RegExp(r'^FormatException:\s*'), '');
    // Ancien bug : HTML Render décodé comme JSON → message illisible
    if (s.contains('<!DOCTYPE') || s.contains('Unexpected character')) {
      return 'Le serveur est momentanément indisponible. Réessayez dans une minute.';
    }
    return s;
  }

  Future<void> _gererOtp() async {
    setState(() => _chargement = true);
    try {
      await ApiAuth.verifierOtp(_telephoneCtrl.text.trim(), _codeOtpCtrl.text.trim());
      if (mounted) {
        ToastWidget.show(context, 'Numéro vérifié. Créez votre PIN.', type: 'succes');
        setState(() => _etape = 'PIN');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, _msgErreur(e), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _gererPin() async {
    if (_pinCtrl.text.length != 4 || !RegExp(r'^\d{4}$').hasMatch(_pinCtrl.text)) {
      ToastWidget.show(context, 'Le PIN doit contenir 4 chiffres', type: 'erreur');
      return;
    }
    if (_pinCtrl.text != _confirmationPinCtrl.text) {
      ToastWidget.show(context, 'Les codes PIN ne correspondent pas.', type: 'erreur');
      return;
    }
    setState(() => _chargement = true);
    final auth = context.read<AuthProvider>();
    try {
      final data = await ApiAuth.definirPin(_telephoneCtrl.text.trim(), _pinCtrl.text.trim());
      final token = data['token'] as String;
      final utilisateur = Utilisateur.fromJson(data['utilisateur'] as Map<String, dynamic>);
      if (!AppFlavorConfig.roleCompatible(utilisateur.role)) {
        throw Exception(
          AppFlavorConfig.estPrestataire
              ? 'Ce compte n\'est pas un compte prestataire. Utilisez l\'app RESERVA Client.'
              : 'Ce compte est prestataire. Utilisez l\'app RESERVA Pro.',
        );
      }
      await auth.connecterStore(token, utilisateur);
      if (mounted) {
        ToastWidget.show(context, 'PIN créé — bienvenue sur ${AppFlavorConfig.nomApp} !', type: 'succes');
        context.go('/accueil');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, _msgErreur(e), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
              color: AppCouleurs.primaireFonce,
              child: Row(
                children: [
                  IconButton(
                    onPressed: () {
                      if (_etape == 'FORMULAIRE') {
                        context.go('/bienvenue');
                      } else if (_etape == 'OTP') {
                        setState(() => _etape = 'FORMULAIRE');
                      } else {
                        setState(() => _etape = 'OTP');
                      }
                    },
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                  ),
                  Expanded(
                    child: Text(
                      AppFlavorConfig.nomApp,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_titreEtape, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppCouleurs.texte)),
                    const SizedBox(height: 8),
                    Text(_sousTitreEtape, style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire, height: 1.4)),
                    const SizedBox(height: 24),
                    if (_etape == 'FORMULAIRE') _etapeFormulaire(),
                    if (_etape == 'OTP') _etapeOtp(),
                    if (_etape == 'PIN') _etapePin(),
                    const SizedBox(height: 20),
                    Center(
                      child: TextButton(
                        onPressed: () => context.go('/connexion'),
                        child: Text(
                          'Déjà un compte ? Se connecter',
                          style: TextStyle(color: AppCouleurs.primaire, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String get _titreEtape {
    switch (_etape) {
      case 'OTP':
        return 'Vérification SMS';
      case 'PIN':
        return 'Créez votre code PIN';
      default:
        return 'Vos informations';
    }
  }

  String get _sousTitreEtape {
    switch (_etape) {
      case 'OTP':
        return 'Entrez le code reçu par SMS. C\'est la seule fois où un SMS est requis.';
      case 'PIN':
        return 'Ce PIN à 4 chiffres servira pour toutes vos prochaines connexions — sans SMS.';
      default:
        return 'Complétez votre profil ${AppFlavorConfig.estPrestataire ? 'prestataire' : 'client'}, acceptez les CGU, puis recevez le SMS.';
    }
  }

  Widget _boutonPrincipal(String label, VoidCallback onPressed) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          gradient: const LinearGradient(colors: [AppCouleurs.primaire, Color(0xFF3B82F6)]),
        ),
        child: ElevatedButton(
          onPressed: _chargement ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: _chargement
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('→  ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _etapeFormulaire() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Champ(
          libelle: 'Téléphone',
          controller: _telephoneCtrl,
          placeholder: '+243…',
          keyboardType: TextInputType.phone,
          prefixIcon: Icons.phone_outlined,
        ),
        const SizedBox(height: 12),
        Champ(libelle: 'Nom complet', controller: _nomCtrl, placeholder: 'Ex: Jean Mukendi', prefixIcon: Icons.person_outline),
        const SizedBox(height: 12),
        Champ(
          libelle: 'Code de parrainage (optionnel)',
          controller: _codeParrainageCtrl,
          placeholder: 'Ex: RESV-JEAN-1234',
          prefixIcon: Icons.card_giftcard_outlined,
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Checkbox(
              value: _accepteCgu,
              activeColor: AppCouleurs.primaire,
              onChanged: (v) => setState(() => _accepteCgu = v ?? false),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Wrap(
                  children: [
                    const Text('J\'accepte les ', style: TextStyle(fontSize: 13)),
                    GestureDetector(
                      onTap: () => context.push('/cgu'),
                      child: const Text('CGU', style: TextStyle(fontSize: 13, color: AppCouleurs.primaire, fontWeight: FontWeight.w700, decoration: TextDecoration.underline)),
                    ),
                    const Text(' et le ', style: TextStyle(fontSize: 13)),
                    GestureDetector(
                      onTap: () => context.push('/manuel'),
                      child: const Text('manuel utilisateur', style: TextStyle(fontSize: 13, color: AppCouleurs.primaire, fontWeight: FontWeight.w700, decoration: TextDecoration.underline)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _boutonPrincipal('Recevoir le SMS', _gererFormulaire),
      ],
    );
  }

  Widget _etapeOtp() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Code envoyé au ${_telephoneCtrl.text}', style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
        const SizedBox(height: 12),
        OtpChamp(
          libelle: 'Code de vérification',
          controller: _codeOtpCtrl,
          onCompleted: (_) => _gererOtp(),
        ),
        const SizedBox(height: 16),
        _boutonPrincipal('Vérifier', _gererOtp),
        TextButton(
          onPressed: () async {
            final hash = await obtenirSmsAppHash();
            try {
              final data = await ApiAuth.renvoyerOtp(_telephoneCtrl.text.trim(), smsAppHash: hash);
              if (mounted) {
                final smsOk = data['smsEnvoye'] != false;
                ToastWidget.show(
                  context,
                  smsOk
                      ? 'Nouveau code envoyé.'
                      : 'Service SMS momentanément indisponible. Réessayez plus tard.',
                  type: smsOk ? 'succes' : 'erreur',
                );
              }
            } catch (e) {
              if (mounted) ToastWidget.show(context, _msgErreur(e), type: 'erreur');
            }
          },
          child: const Text('Renvoyer le code', style: TextStyle(fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }

  Widget _etapePin() {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: AppCouleurs.succesClair,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Text(
            'Mémorisez ce PIN : il remplace les SMS pour chaque connexion future.',
            style: TextStyle(fontSize: 13, color: AppCouleurs.texte, height: 1.35),
          ),
        ),
        Champ(libelle: 'Code PIN (4 chiffres)', controller: _pinCtrl, obscureText: true, keyboardType: TextInputType.number, maxLength: 4, prefixIcon: Icons.lock_outline),
        const SizedBox(height: 12),
        Champ(libelle: 'Confirmer le PIN', controller: _confirmationPinCtrl, obscureText: true, keyboardType: TextInputType.number, maxLength: 4, prefixIcon: Icons.lock_outline),
        const SizedBox(height: 16),
        _boutonPrincipal('Terminer', _gererPin),
      ],
    );
  }
}
