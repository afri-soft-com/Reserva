import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:smart_auth/smart_auth.dart';
import '../theme.dart';

bool get _estAndroid => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

/// Hash SMS Retriever (11 car.) pour autofill sans permission READ_SMS.
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

/// Champ OTP 6 chiffres — Android SMS Retriever (sans dialogue) + iOS oneTimeCode.
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

class _OtpChampState extends State<OtpChamp> {
  late final List<TextEditingController> _cases;
  late final List<FocusNode> _focus;
  final TextEditingController _autofillCtrl = TextEditingController();
  final FocusNode _autofillFocus = FocusNode();
  bool _ecouteAndroid = false;

  @override
  void initState() {
    super.initState();
    _cases = List.generate(6, (_) => TextEditingController());
    _focus = List.generate(6, (_) => FocusNode());
    widget.controller.addListener(_syncDepuisParent);
    _autofillCtrl.addListener(_syncDepuisAutofill);
    if (widget.controller.text.length == 6) {
      _appliquerCode(widget.controller.text);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _demarrerAutofillSms();
      if (mounted) _focus[0].requestFocus();
    });
  }

  Future<void> _demarrerAutofillSms() async {
    if (!_estAndroid || _ecouteAndroid) return;
    _ecouteAndroid = true;
    try {
      // SMS Retriever : aucune permission / aucun dialogue utilisateur.
      final result = await SmartAuth.instance.getSmsWithRetrieverApi(
        matcher: r'\d{6}',
      );
      if (!mounted) return;
      if (result.hasData) {
        final code = result.data?.code ?? _extraireCode(result.data?.sms ?? '');
        if (code != null && code.length >= 4) {
          _appliquerCode(code);
          _publier();
          TextInput.finishAutofillContext(shouldSave: false);
          return;
        }
      }
      if (!result.isCanceled && mounted && _lireCode().length < 6) {
        Future<void>.delayed(const Duration(milliseconds: 600), () {
          if (mounted && _lireCode().length < 6) _demarrerAutofillSms();
        });
      }
    } catch (e) {
      debugPrint('OtpChamp SmartAuth Retriever: $e');
    } finally {
      _ecouteAndroid = false;
    }
  }

  String? _extraireCode(String sms) {
    final m = RegExp(r'\d{6}').firstMatch(sms);
    return m?.group(0);
  }

  void _syncDepuisParent() {
    final t = widget.controller.text.replaceAll(RegExp(r'\D'), '');
    if (t.length <= 6 && t != _lireCode()) {
      _appliquerCode(t);
    }
  }

  void _syncDepuisAutofill() {
    final digits = _autofillCtrl.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length >= 4) {
      _appliquerCode(digits);
      _publier();
      if (digits.length >= 6) {
        TextInput.finishAutofillContext(shouldSave: false);
      }
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
    final joined = digits.length > 6 ? digits.substring(0, 6) : digits;
    if (_autofillCtrl.text != joined) {
      _autofillCtrl.value = TextEditingValue(
        text: joined,
        selection: TextSelection.collapsed(offset: joined.length),
      );
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
    widget.controller.removeListener(_syncDepuisParent);
    _autofillCtrl.removeListener(_syncDepuisAutofill);
    if (_estAndroid) {
      SmartAuth.instance.removeSmsRetrieverApiListener();
    }
    _autofillCtrl.dispose();
    _autofillFocus.dispose();
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.libelle != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              widget.libelle!,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppCouleurs.texte),
            ),
          ),
        AutofillGroup(
          child: Stack(
            children: [
              Positioned(
                left: 0,
                top: 0,
                width: 1,
                height: 1,
                child: Opacity(
                  opacity: 0.01,
                  child: TextField(
                    controller: _autofillCtrl,
                    focusNode: _autofillFocus,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    keyboardType: TextInputType.number,
                    enableSuggestions: false,
                    autocorrect: false,
                    maxLength: 6,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      counterText: '',
                    ),
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(6, (i) {
                  return SizedBox(
                    width: 48,
                    height: 56,
                    child: TextField(
                      controller: _cases[i],
                      focusNode: _focus[i],
                      autofillHints: i == 0 ? const [AutofillHints.oneTimeCode] : null,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      maxLength: 6,
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
            ],
          ),
        ),
        if (widget.erreur != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(widget.erreur!, style: const TextStyle(fontSize: 12, color: AppCouleurs.alerte)),
          ),
        const SizedBox(height: 6),
        const Text(
          'Le code SMS se remplit automatiquement dès réception.',
          style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire),
        ),
      ],
    );
  }
}
