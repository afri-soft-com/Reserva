import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../config.dart';

class GoogleAuthService {
  /// Client OAuth **Web** RESERVA (public). Toujours utilisé pour idToken Android —
  /// ne pas dépendre uniquement de --dart-define (une valeur vide l'écrase).
  static const String webClientId =
      '473749172261-74ardi53uajb5f3m992kcsvg4u0jes7i.apps.googleusercontent.com';

  static String get _serverClientId {
    final fromEnv = AppConfig.googleServerClientId.trim();
    if (fromEnv.isNotEmpty && fromEnv.contains('.apps.googleusercontent.com')) {
      return fromEnv;
    }
    return webClientId;
  }

  static GoogleSignIn? _instance;

  static GoogleSignIn get _client {
    _instance ??= GoogleSignIn(
      scopes: const ['email', 'profile', 'openid'],
      serverClientId: _serverClientId,
      // forceCodeForRefreshToken: true,
    );
    return _instance!;
  }

  /// Message lisible pour les erreurs Google Sign-In (ex. code 10 = SHA-1 Play).
  static String messageErreur(Object e) {
    if (e is PlatformException) {
      final code = e.code;
      final details = '${e.message ?? ''} ${e.details ?? ''}';
      if (code == 'sign_in_failed' && details.contains('10:')) {
        return 'Connexion Google indisponible : certificat Android non enregistré '
            '(SHA-1 Play App Signing manquant dans Google Cloud pour cette app).';
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
          '(SHA-1 Play App Signing manquant dans Google Cloud pour cette app).';
    }
    return s;
  }

  /// Retourne l'idToken Google, ou null si annulé.
  static Future<String?> obtenirIdToken() async {
    final google = _client;
    try {
      await google.disconnect();
    } catch (_) {
      await google.signOut();
    }

    final compte = await google.signIn();
    if (compte == null) return null;

    var auth = await compte.authentication;
    var idToken = auth.idToken;

    // Parfois le 1er appel ne remonte pas l'idToken — 2e tentative après silent.
    if (idToken == null || idToken.isEmpty) {
      final silent = await google.signInSilently();
      auth = await (silent ?? compte).authentication;
      idToken = auth.idToken;
    }

    if (idToken == null || idToken.isEmpty) {
      throw Exception(
        'Impossible d\'obtenir le token Google (idToken vide). '
        'Désinstallez RESERVA puis réinstallez depuis Play Internal testing. '
        'Vérifiez aussi le client OAuth Android com.reserva.client + SHA-1 Play.',
      );
    }
    return idToken;
  }
}
