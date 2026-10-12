import 'dart:io';

class AppConfig {
  static String get apiUrl {
    const depuisEnv = String.fromEnvironment('API_URL');
    if (depuisEnv.isNotEmpty) return depuisEnv;
    if (Platform.isAndroid) return 'http://10.0.2.2:4000/api';
    return 'http://127.0.0.1:4000/api';
  }

  /// Client ID OAuth de type **Web** (requis pour obtenir un idToken Android).
  /// Ex: --dart-define=GOOGLE_SERVER_CLIENT_ID=xxxx.apps.googleusercontent.com
  /// Fallback = client Web RESERVA (ID public OAuth, pas un secret).
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue: '473749172261-74ardi53uajb5f3m992kcsvg4u0jes7i.apps.googleusercontent.com',
  );

  static const Duration requeteTimeout = Duration(seconds: 15);
}
