import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:smart_auth/smart_auth.dart';
import '../services/otp_sms_autofill.dart';
import '../theme.dart';

bool get _estAndroid => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;
bool get _estIos => !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;

/// Hash SMS Retriever (11 car.) — réservé si le SMS inclut un jour le hash.
/// Aujourd'hui SerdiPay refuse `<#>` / hash → autofill Android via User Consent.
Future<String?> obtenirSmsAppHash() async {
  if (!_estAndroid) return null;
  try {
    final result = await SmartAuth.instance.getAppSignature();
    if (!result.hasData) return null;
    final hash = (result.data ?? '').trim();
    if (hash.length >= 11) return hash.substring(0, 11);
    return hash.isEmpty ? null : hash;
  } catch (e) {
    debugPrint('obtenirSmsAppHash: $e');
    return null;
  }
}

/// Champ OTP 6 chiffres — Android User Consent + iOS oneTimeCode (clavier).
class OtpChamp extends StatefulWidget {
  final TextEditingController controller;
  final ValueChanged<String>? onCompleted;
  final String? libelle;
  final String? erreur;

  const OtpChamp({
    super.key,
    required this.controller,
    this.onCompleted,
    this.libelle,
    this.erreur,
  });

  @override
  State<OtpChamp> createState() => _OtpChampState();
}

class _OtpChampState extends State<OtpChamp> with WidgetsBindingObserver {
  late final List<TextEditingController> _cases;
  late final List<FocusNode> _focus;
  bool _ecouteAndroid = false;
  int _retriesConsent = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _cases = List.generate(6, (_) => TextEditingController());
    _focus = List.generate(6, (_) => FocusNode());
    widget.controller.addListener(_syncDepuisParent);
    if (widget.controller.text.length == 6) {
      _appliquerCode(widget.controller.text);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _demarrerAutofillSms();
      if (mounted) _focus[0].requestFocus();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Au retour Messages → app, relancer l'écoute Android si le code n'est pas rempli.
    if (state == AppLifecycleState.resumed &&
        _estAndroid &&
        _lireCode().length < 6 &&
        !_ecouteAndroid) {
      _demarrerAutofillSms();
    }
  }

  Future<void> _demarrerAutofillSms() async {
    if (!_estAndroid || _ecouteAndroid) return;
    if (_lireCode().length >= 6) return;
    _ecouteAndroid = true;
    try {
      // User Consent (aligné Mova) : dialogue système 1 tap, sans hash dans le SMS.
      await demarrerEcouteOtpSms(
        onCode: (code) {
          if (!mounted) return;
          _appliquerCode(code);
          _publier();
          TextInput.finishAutofillContext(shouldSave: false);
        },
      );
      if (mounted && _lireCode().length < 6 && _retriesConsent < 3) {
        _retriesConsent++;
        Future<void>.delayed(const Duration(milliseconds: 800), () {
          if (mounted && _lireCode().length < 6) _demarrerAutofillSms();
        });
      }
    } catch (e) {
      debugPrint('OtpChamp SmartAuth UserConsent: $e');
    } finally {
      _ecouteAndroid = false;
    }
  }

  void _syncDepuisParent() {
    final t = widget.controller.text.replaceAll(RegExp(r'\D'), '');
    if (t.length <= 6 && t != _lireCode()) {
      _appliquerCode(t);
    }
  }

  String _lireCode() => _cases.map((c) => c.text).join();

  void _appliquerCode(String code) {
    final digits = code.replaceAll(RegExp(r'\D'), '');
    for (var i = 0; i < 6; i++) {
      final ch = i < digits.length ? digits[i] : '';
      if (_cases[i].text != ch) {
        _cases[i].value = TextEditingValue(
          text: ch,
          selection: TextSelection.collapsed(offset: ch.length),
        );
      }
    }
  }

  void _publier() {
    final code = _lireCode();
    if (widget.controller.text != code) {
      widget.controller.value = TextEditingValue(
        text: code,
        selection: TextSelection.collapsed(offset: code.length),
      );
    }
    if (code.length == 6) {
      widget.onCompleted?.call(code);
    }
  }

  void _surChange(int index, String value) {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    // Collage / autofill iOS (clavier « From Messages ») : code complet dans une case.
    if (digits.length > 1) {
      _appliquerCode(digits);
      _publier();
      if (digits.length >= 6) {
        _focus[5].unfocus();
        TextInput.finishAutofillContext(shouldSave: false);
      } else {
        _focus[digits.length.clamp(0, 5)].requestFocus();
      }
      return;
    }

    if (digits.isEmpty) {
      _cases[index].clear();
      _publier();
      if (index > 0) _focus[index - 1].requestFocus();
      return;
    }

    _cases[index].text = digits[digits.length - 1];
    _cases[index].selection = const TextSelection.collapsed(offset: 1);
    _publier();
    if (index < 5) {
      _focus[index + 1].requestFocus();
    } else {
      _focus[index].unfocus();
      TextInput.finishAutofillContext(shouldSave: false);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    widget.controller.removeListener(_syncDepuisParent);
    arreterEcouteOtpSms();
    for (final c in _cases) {
      c.dispose();
    }
    for (final f in _focus) {
      f.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final aide = _estAndroid
        ? 'À réception du SMS, validez le dialogue pour remplir le code automatiquement.'
        : _estIos
            ? 'Le code apparaît au-dessus du clavier (Messages) — touchez-le pour remplir.'
            : 'Saisissez le code reçu par SMS.';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.libelle != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              widget.libelle!,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppCouleurs.texte),
            ),
          ),
        AutofillGroup(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(6, (i) {
              return SizedBox(
                width: 48,
                height: 56,
                child: TextField(
                  controller: _cases[i],
                  focusNode: _focus[i],
                  // iOS : oneTimeCode sur la 1re case (suggestion clavier Messages).
                  autofillHints: i == 0 ? const [AutofillHints.oneTimeCode] : null,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  // >1 pour accepter collage / autofill du code entier dans la 1re case.
                  maxLength: i == 0 ? 6 : 1,
                  enableSuggestions: false,
                  autocorrect: false,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: 1),
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: InputDecoration(
                    counterText: '',
                    filled: true,
                    fillColor: AppCouleurs.blanc,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: widget.erreur != null ? AppCouleurs.alerte : AppCouleurs.bordure,
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: widget.erreur != null ? AppCouleurs.alerte : AppCouleurs.bordure,
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppCouleurs.primaire, width: 2),
                    ),
                  ),
                  onChanged: (v) => _surChange(i, v),
                ),
              );
            }),
          ),
        ),
        if (widget.erreur != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(widget.erreur!, style: const TextStyle(fontSize: 12, color: AppCouleurs.alerte)),
          ),
        const SizedBox(height: 6),
        Text(
          aide,
          style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire),
        ),
      ],
    );
  }
}
