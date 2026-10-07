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
  static const String googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

  static const Duration requeteTimeout = Duration(seconds: 15);
}
