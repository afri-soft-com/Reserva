import 'api_client.dart';

class ApiCodesPromos {
  static Future<Map<String, dynamic>> validerCode(String code, {required double montant}) async {
    final data = await ApiClient.post('/codes-promos/valider', body: {
      'code': code,
      'montant': montant,
    });
    return data as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> appliquerCode(String code, {required String reservationId}) async {
    final data = await ApiClient.post('/codes-promos/appliquer', body: {
      'code': code,
      'reservationId': reservationId,
    });
    return data as Map<String, dynamic>;
  }

  static Future<List<dynamic>> listerDisponibles() async {
    final data = await ApiClient.get('/codes-promos/disponibles/publics');
    return (data as Map<String, dynamic>)['items'] as List<dynamic>? ?? data as List<dynamic>;
  }
}
