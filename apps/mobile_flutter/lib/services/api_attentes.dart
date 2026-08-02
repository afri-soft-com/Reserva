import 'api_client.dart';

class ApiAttentes {
  static Future<Map<String, dynamic>> inscrire({required String serviceId, required String creneauId}) async {
    return (await ApiClient.post('/attentes/inscrire', body: {
      'serviceId': serviceId,
      'creneauId': creneauId,
    })) as Map<String, dynamic>;
  }

  static Future<List<dynamic>> listerMesAttentes() async {
    final data = await ApiClient.get('/attentes/moi');
    return (data as List<dynamic>? ?? []);
  }

  static Future<Map<String, dynamic>> quitter(String entreeId) async {
    return (await ApiClient.delete('/attentes/$entreeId')) as Map<String, dynamic>;
  }
}
