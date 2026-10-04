import 'api_client.dart';

class ApiTransport {
  static Future<List<String>> listerVilles() async {
    final data = await ApiClient.get('/transport/villes');
    if (data is List) return data.map((e) => e.toString()).toList();
    return [];
  }

  static Future<Map<String, dynamic>> rechercher({
    required String origine,
    required String destination,
    required String date,
    int places = 1,
    String tri = 'depart',
  }) async {
    final data = await ApiClient.get('/transport/rechercher', params: {
      'origine': origine,
      'destination': destination,
      'date': date,
      'places': '$places',
      'tri': tri,
    });
    return data is Map<String, dynamic> ? data : {'items': [], 'total': 0};
  }

  static Future<Map<String, dynamic>> detailTrajet(String id, {int places = 1}) async {
    final data = await ApiClient.get('/transport/trajets/$id', params: {'places': '$places'});
    return data is Map<String, dynamic> ? data : {};
  }

  static Future<Map<String, dynamic>> creerHold({required String trajetId, required int places}) async {
    final data = await ApiClient.post('/checkout/billets/hold', body: {
      'trajetId': trajetId,
      'places': places,
    });
    return data is Map<String, dynamic> ? data : {};
  }

  static Future<List<dynamic>> mesBillets() async {
    final data = await ApiClient.get('/checkout/billets');
    if (data is List) return data;
    return [];
  }

  static Future<Map<String, dynamic>> obtenirBillet(String id) async {
    final data = await ApiClient.get('/checkout/billets/$id');
    return data is Map<String, dynamic> ? data : {};
  }

  static Future<Map<String, dynamic>> payerBillet({
    required String billetId,
    required String operateur,
    required double montant,
    String? telephonePaiement,
  }) async {
    final data = await ApiClient.post('/checkout/billets/$billetId/payer', body: {
      'operateur': operateur,
      'montant': montant,
      if (telephonePaiement != null) 'telephonePaiement': telephonePaiement,
    });
    return data is Map<String, dynamic> ? data : {};
  }

  static Future<Map<String, dynamic>> annulerBillet(String id) async {
    final data = await ApiClient.post('/checkout/billets/$id/annuler');
    return data is Map<String, dynamic> ? data : {};
  }
}
