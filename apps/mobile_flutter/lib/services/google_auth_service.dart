import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../config.dart';

class GoogleAuthService {
  /// Client Web OAuth (public) — secours si --dart-define est vide (écrase defaultValue).
  static const String _webClientIdFallback =
      '473749172261-74ardi53uajb5f3m992kcsvg4u0jes7i.apps.googleusercontent.com';

  static String get _serverClientId {
    final fromEnv = AppConfig.googleServerClientId.trim();
    return fromEnv.isNotEmpty ? fromEnv : _webClientIdFallback;
  }

  static GoogleSignIn get _client {
    return GoogleSignIn(
      scopes: const ['email', 'profile'],
      serverClientId: _serverClientId,
    );
  }

  /// Message lisible pour les erreurs Google Sign-In (ex. code 10 = SHA-1 Play).
  static String messageErreur(Object e) {
    if (e is PlatformException) {
      final code = e.code;
      final details = '${e.message ?? ''} ${e.details ?? ''}';
      if (code == 'sign_in_failed' && details.contains('10:')) {
        return 'Connexion Google indisponible : certificat Android non enregistré '
            '(SHA-1 Play App Signing manquant dans Google Cloud).';
      }
      if (code == 'network_error') {
        return 'Réseau indisponible. Réessayez la connexion Google.';
      }
      if (code == 'sign_in_canceled' || code == 'sign_in_cancelled') {
        return 'Connexion Google annulée';
      }
    }
    final s = e.toString();
    if (s.contains('sign_in_failed') && s.contains('10:')) {
      return 'Connexion Google indisponible : certificat Android non enregistré '
          '(SHA-1 Play App Signing manquant dans Google Cloud).';
    }
    return s;
  }

  /// Retourne l'idToken Google, ou null si annulé.
  static Future<String?> obtenirIdToken() async {
    final google = _client;
    await google.signOut();
    final compte = await google.signIn();
    if (compte == null) return null;
    final auth = await compte.authentication;
    final idToken = auth.idToken;
    if (idToken == null || idToken.isEmpty) {
      throw Exception(
        'Impossible d\'obtenir le token Google. '
        'Configurez GOOGLE_SERVER_CLIENT_ID (Client ID Web) via --dart-define.',
      );
    }
    return idToken;
  }
}
