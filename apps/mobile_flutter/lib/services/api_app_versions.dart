import 'api_client.dart';

class ApiAppVersions {
  static Future<Map<String, dynamic>> lire() async {
    final data = await ApiClient.get('/app/versions');
    if (data is! Map) {
      throw Exception('Réponse /app/versions invalide');
    }
    final map = Map<String, dynamic>.from(data);
    // Filet si le client a renvoyé l'enveloppe { succes, donnees } entière.
    if (map['donnees'] is Map && map['client'] == null && map['pro'] == null) {
      return Map<String, dynamic>.from(map['donnees'] as Map);
    }
    return map;
  }
}
