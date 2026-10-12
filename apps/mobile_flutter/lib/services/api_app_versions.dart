import 'api_client.dart';

class ApiAppVersions {
  static Future<Map<String, dynamic>> lire() async {
    final data = await ApiClient.get('/app/versions');
    return Map<String, dynamic>.from(data as Map);
  }
}
