import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme.dart';

/// Champ OTP 6 chiffres avec autofill SMS (style WhatsApp / iOS one-time-code).
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
  StreamSubscription? _smsSub;

  @override
  void initState() {
    super.initState();
    _cases = List.generate(6, (_) => TextEditingController());
    _focus = List.generate(6, (_) => FocusNode());
    widget.controller.addListener(_syncDepuisParent);
    if (widget.controller.text.length == 6) {
      _appliquerCode(widget.controller.text);
    }
    // Android / iOS : écoute du presse-papiers SMS via autofill system
    _demarrerAutofillSms();
  }

  Future<void> _demarrerAutofillSms() async {
    // AutofillHints.oneTimeCode déclenche le clavier / suggestions système.
    // Sur Android 8+, Google Messages propose le code automatiquement.
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
        _cases[i].text = ch;
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
    // Collage du code complet (SMS autofill)
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
    _smsSub?.cancel();
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
          child: Row(
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
        const Text(
          'Le code SMS se remplit automatiquement lorsqu\'il est détecté.',
          style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire),
        ),
      ],
    );
  }
}
