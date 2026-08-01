import 'api_client.dart';

class ApiCartesCadeaux {
  static Future<Map<String, dynamic>> acheter({
    required double montant,
    String devise = 'CDF',
    String? beneficiaireTelephone,
  }) async {
    return (await ApiClient.post('/cartes-cadeaux', body: {
      'montant': montant,
      'devise': devise,
      if (beneficiaireTelephone != null && beneficiaireTelephone.trim().isNotEmpty)
        'beneficiaireTelephone': beneficiaireTelephone.trim(),
    })) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> mesCartes() async {
    return (await ApiClient.get('/cartes-cadeaux/moi')) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> detailParCode(String code) async {
    return (await ApiClient.get('/cartes-cadeaux/par-code/${Uri.encodeComponent(code)}')) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> utiliser({
    required String code,
    required String reservationId,
  }) async {
    return (await ApiClient.post('/cartes-cadeaux/utiliser', body: {
      'code': code,
      'reservationId': reservationId,
    })) as Map<String, dynamic>;
  }
}
