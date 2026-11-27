import 'api_client.dart';

/// Espace prestataire hôtelier (microservice hotels, /api/hotels/pro).
class ApiHotelsPro {
  static Map<String, dynamic> _map(dynamic data) =>
      data is Map<String, dynamic> ? data : <String, dynamic>{};

  static Future<List<dynamic>> mesHotels() async {
    final data = await ApiClient.get('/hotels/pro/hotels');
    return data is List ? data : [];
  }

  /// Création : route publique existante, le propriétaire est déduit du JWT.
  static Future<Map<String, dynamic>> creerHotel(Map<String, dynamic> body) async =>
      _map(await ApiClient.post('/hotels', body: body));

  static Future<Map<String, dynamic>> modifierHotel(String hotelId, Map<String, dynamic> body) async =>
      _map(await ApiClient.patch('/hotels/pro/hotels/$hotelId', body: body));

  static Future<Map<String, dynamic>> creerChambre(String hotelId, Map<String, dynamic> body) async =>
      _map(await ApiClient.post('/hotels/pro/hotels/$hotelId/chambres', body: body));

  static Future<Map<String, dynamic>> modifierChambre(String chambreId, Map<String, dynamic> body) async =>
      _map(await ApiClient.patch('/hotels/pro/chambres/$chambreId', body: body));

  static Future<Map<String, dynamic>> creerTarif(String chambreId, Map<String, dynamic> body) async =>
      _map(await ApiClient.post('/hotels/pro/chambres/$chambreId/tarifs', body: body));

  static Future<Map<String, dynamic>> modifierTarif(String tarifId, Map<String, dynamic> body) async =>
      _map(await ApiClient.patch('/hotels/pro/tarifs/$tarifId', body: body));

  /// Jours AAAA-MM-JJ, bornes incluses.
  static Future<List<dynamic>> lireInventaire(String chambreId, String du, String au) async {
    final data = await ApiClient.get('/hotels/pro/chambres/$chambreId/inventaire', params: {'du': du, 'au': au});
    return data is List ? data : [];
  }

  /// `total` = chambres à vendre par nuit ; `prix` = prix de la nuit (0 = prix du plan) ;
  /// `joursSemaine` : 0 = dimanche … 6 = samedi (vide = tous les jours).
  static Future<Map<String, dynamic>> definirInventaire(
    String chambreId, {
    required String du,
    required String au,
    int? total,
    double? prix,
    List<int>? joursSemaine,
  }) async {
    return _map(await ApiClient.put('/hotels/pro/chambres/$chambreId/inventaire', body: {
      'du': du,
      'au': au,
      if (total != null) 'total': total,
      if (prix != null) 'prix': prix,
      if (joursSemaine != null && joursSemaine.isNotEmpty) 'joursSemaine': joursSemaine,
    }));
  }
}
