import 'dart:convert';

class JwtDecoder {
  static Map<String, dynamic>? decoder(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final payload = parts[1];
      final normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
      final padded = normalized.padRight(normalized.length + (4 - normalized.length % 4) % 4, '=');
      final decoded = utf8.decode(base64.decode(padded));
      return jsonDecode(decoded) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static bool estExpire(String token) {
    final payload = decoder(token);
    if (payload == null) return true;
    final exp = payload['exp'] as int?;
    if (exp == null) return false;
    return DateTime.now().millisecondsSinceEpoch > exp * 1000;
  }

  static int? tempsRestantSecondes(String token) {
    final payload = decoder(token);
    if (payload == null) return null;
    final exp = payload['exp'] as int?;
    if (exp == null) return null;
    return exp - DateTime.now().millisecondsSinceEpoch ~/ 1000;
  }
}
