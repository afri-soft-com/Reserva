import 'api_client.dart';

class ApiHotels {
  static Future<List<String>> listerVilles() async {
    final data = await ApiClient.get('/hotels/villes');
    if (data is List) return data.map((e) => e.toString()).toList();
    return [];
  }

  static Future<Map<String, dynamic>> rechercher({
    String? ville,
    required String arrivee,
    required String depart,
    int adultes = 2,
    int enfants = 0,
    int? etoilesMin,
    double? prixMax,
    double? noteMin,
    bool annulationGratuite = false,
    bool petitDejeuner = false,
    String tri = 'note',
  }) async {
    final params = <String, String>{
      'arrivee': arrivee,
      'depart': depart,
      'adultes': '$adultes',
      'enfants': '$enfants',
      'tri': tri,
    };
    if (ville != null && ville.isNotEmpty) params['ville'] = ville;
    if (etoilesMin != null) params['etoilesMin'] = '$etoilesMin';
    if (prixMax != null) params['prixMax'] = '$prixMax';
    if (noteMin != null) params['noteMin'] = '$noteMin';
    if (annulationGratuite) params['annulationGratuite'] = 'true';
    if (petitDejeuner) params['petitDejeuner'] = 'true';
    final data = await ApiClient.get('/hotels', params: params);
    return data is Map<String, dynamic> ? data : {'items': [], 'total': 0};
  }

  static Future<Map<String, dynamic>> detail({
    required String hotelId,
    required String arrivee,
    required String depart,
    int adultes = 2,
    int enfants = 0,
  }) async {
    final data = await ApiClient.get('/hotels/$hotelId', params: {
      'arrivee': arrivee,
      'depart': depart,
      'adultes': '$adultes',
      'enfants': '$enfants',
    });
    return data is Map<String, dynamic> ? data : {};
  }

  static Future<Map<String, dynamic>> creerHold(Map<String, dynamic> body) async {
    final data = await ApiClient.post('/checkout/hold', body: body);
    return data is Map<String, dynamic> ? data : {};
  }

  static Future<List<dynamic>> mesSejours() async {
    final data = await ApiClient.get('/checkout/sejours');
    if (data is List) return data;
    return [];
  }

  static Future<Map<String, dynamic>> obtenirSejour(String id) async {
    final data = await ApiClient.get('/checkout/sejours/$id');
    return data is Map<String, dynamic> ? data : {};
  }

  static Future<Map<String, dynamic>> payerSejour({
    required String sejourId,
    required String operateur,
    required double montant,
    String? telephonePaiement,
  }) async {
    final data = await ApiClient.post('/checkout/sejours/$sejourId/payer', body: {
      'operateur': operateur,
      'montant': montant,
      if (telephonePaiement != null) 'telephonePaiement': telephonePaiement,
    });
    return data is Map<String, dynamic> ? data : {};
  }

  static Future<Map<String, dynamic>> annulerSejour(String sejourId) async {
    final data = await ApiClient.post('/checkout/sejours/$sejourId/annuler');
    return data is Map<String, dynamic> ? data : {};
  }
}
