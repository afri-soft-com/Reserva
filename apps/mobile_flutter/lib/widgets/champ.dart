import 'package:flutter/material.dart';
import '../theme.dart';

class Champ extends StatelessWidget {
  final String? libelle;
  final String? erreur;
  final String? aide;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final bool obscureText;
  final TextInputType? keyboardType;
  final int? maxLength;
  final int? maxLines;
  final String? placeholder;
  final ValueChanged<String>? onChanged;
  final IconData? prefixIcon;

  const Champ({
    super.key,
    this.libelle,
    this.erreur,
    this.aide,
    this.controller,
    this.validator,
    this.obscureText = false,
    this.keyboardType,
    this.maxLength,
    this.maxLines,
    this.placeholder,
    this.onChanged,
    this.prefixIcon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (libelle != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(libelle!, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppCouleurs.texte)),
          ),
        TextFormField(
          controller: controller,
          onChanged: onChanged,
          obscureText: obscureText,
          keyboardType: keyboardType,
          maxLength: maxLength,
          maxLines: maxLines ?? 1,
          validator: validator,
          decoration: InputDecoration(
            hintText: placeholder,
            counterText: '',
            errorText: erreur,
            helperText: aide,
            prefixIcon: prefixIcon != null ? Icon(prefixIcon, color: AppCouleurs.texteSecondaire) : null,
            filled: true,
            fillColor: AppCouleurs.blanc,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRayons.champ),
              borderSide: BorderSide(color: erreur != null ? AppCouleurs.alerte : AppCouleurs.bordure),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRayons.champ),
              borderSide: BorderSide(color: erreur != null ? AppCouleurs.alerte : AppCouleurs.bordure),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRayons.champ),
              borderSide: BorderSide(color: erreur != null ? AppCouleurs.alerte : AppCouleurs.primaire, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
          style: const TextStyle(fontSize: 16, color: AppCouleurs.texte),
        ),
      ],
    );
  }
}
