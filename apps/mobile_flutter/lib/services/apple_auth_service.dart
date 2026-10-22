import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

/// Sign in with Apple — requis iOS si Google est proposé (App Store 4.8).
class AppleAuthService {
  static bool get estDisponible {
    if (kIsWeb) return false;
    return Platform.isIOS;
  }

  /// Retourne identityToken + nom (nom seulement à la 1ʳᵉ autorisation Apple).
  static Future<({String identityToken, String? nom})?> obtenirCredentials() async {
    if (!estDisponible) return null;
    final dispo = await SignInWithApple.isAvailable();
    if (!dispo) return null;

    final cred = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
    );
    final token = cred.identityToken;
    if (token == null || token.isEmpty) return null;

    final parts = [
      if (cred.givenName != null && cred.givenName!.trim().isNotEmpty) cred.givenName!.trim(),
      if (cred.familyName != null && cred.familyName!.trim().isNotEmpty) cred.familyName!.trim(),
    ];
    final nom = parts.isEmpty ? null : parts.join(' ');
    return (identityToken: token, nom: nom);
  }

  static String messageErreur(Object e) {
    if (e is SignInWithAppleAuthorizationException) {
      switch (e.code) {
        case AuthorizationErrorCode.canceled:
          return 'Connexion Apple annulée';
        case AuthorizationErrorCode.notHandled:
        case AuthorizationErrorCode.notInteractive:
          return 'Connexion Apple indisponible sur cet appareil';
        default:
          return 'Échec connexion Apple (${e.code.name})';
      }
    }
    final s = e.toString().replaceFirst(RegExp(r'^Exception:\s*'), '');
    return s;
  }
}
