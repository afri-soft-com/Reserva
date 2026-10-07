import 'package:google_sign_in/google_sign_in.dart';
import '../config.dart';

class GoogleAuthService {
  static GoogleSignIn get _client {
    final serverId = AppConfig.googleServerClientId;
    return GoogleSignIn(
      scopes: const ['email', 'profile'],
      serverClientId: serverId.isEmpty ? null : serverId,
    );
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
