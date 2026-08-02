import 'api_client.dart';

class ApiAlertes {
  static Future<Map<String, dynamic>> creerAlerte(String serviceId) async {
    return (await ApiClient.post('/alertes', body: {
      'serviceId': serviceId,
    })) as Map<String, dynamic>;
  }

  static Future<List<dynamic>> listerMesAlertes() async {
    final data = await ApiClient.get('/alertes/moi');
    if (data is Map && data.containsKey('items')) {
      return (data['items'] as List<dynamic>? ?? []);
    }
    return (data as List<dynamic>? ?? []);
  }

  static Future<Map<String, dynamic>> desactiverAlerte(String alerteId) async {
    return (await ApiClient.delete('/alertes/$alerteId')) as Map<String, dynamic>;
  }
}
