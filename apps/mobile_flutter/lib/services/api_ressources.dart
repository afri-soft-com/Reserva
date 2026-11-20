import 'api_client.dart';

/// Tables des services en mode TABLE (restaurants) — espace prestataire.
class ApiRessources {
  static Future<List<dynamic>> lister(String serviceId) async {
    final data = await ApiClient.get('/ressources/service/$serviceId');
    return data is List ? data : [];
  }

  static Future<Map<String, dynamic>> creer({
    required String serviceId,
    required String nom,
    required int capacite,
  }) async {
    return (await ApiClient.post('/ressources', body: {
      'serviceId': serviceId,
      'nom': nom,
      'capacite': capacite,
    })) as Map<String, dynamic>;
  }

  /// Crée « Table 1 » … « Table N » (numérotation à la suite des existantes).
  static Future<Map<String, dynamic>> creerEnLot({
    required String serviceId,
    required int nombre,
    required int capacite,
    String? prefixe,
  }) async {
    return (await ApiClient.post('/ressources/lot', body: {
      'serviceId': serviceId,
      'nombre': nombre,
      'capacite': capacite,
      if (prefixe != null && prefixe.trim().isNotEmpty) 'prefixe': prefixe.trim(),
    })) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> modifier(String ressourceId, Map<String, dynamic> body) async {
    return (await ApiClient.patch('/ressources/$ressourceId', body: body)) as Map<String, dynamic>;
  }

  static Future<void> retirer(String ressourceId) async {
    await ApiClient.delete('/ressources/$ressourceId');
  }

  static Future<Map<String, dynamic>> reattribuer(String reservationId, String ressourceId) async {
    return (await ApiClient.post('/ressources/reservations/$reservationId/table', body: {
      'ressourceId': ressourceId,
    })) as Map<String, dynamic>;
  }
}
