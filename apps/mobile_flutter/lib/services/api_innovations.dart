import 'api_client.dart';

class ApiInnovations {
  static Future<List<dynamic>> listerBeneficiaires() async {
    final r = await ApiClient.get('/innovations/beneficiaires');
    return (r['data'] as List?) ?? [];
  }

  static Future<Map<String, dynamic>> creerBeneficiaire({
    required String nom,
    String? telephone,
    String lienParente = 'AUTRE',
  }) async {
    final r = await ApiClient.post('/innovations/beneficiaires', body: {
      'nom': nom,
      if (telephone != null) 'telephone': telephone,
      'lienParente': lienParente,
    });
    return Map<String, dynamic>.from(r['data'] as Map);
  }

  static Future<void> supprimerBeneficiaire(String id) async {
    await ApiClient.delete('/innovations/beneficiaires/$id');
  }

  static Future<Map<String, dynamic>> reclamerGarantie({
    required String reservationId,
    required String motif,
  }) async {
    final r = await ApiClient.post('/innovations/garantie/reclamer', body: {
      'reservationId': reservationId,
      'motif': motif,
    });
    return Map<String, dynamic>.from(r['data'] as Map);
  }

  static Future<Map<String, dynamic>> ouvrirLitige({
    required String reservationId,
    required String motif,
    required String description,
    List<String>? preuvesUrl,
  }) async {
    final r = await ApiClient.post('/innovations/litiges', body: {
      'reservationId': reservationId,
      'motif': motif,
      'description': description,
      if (preuvesUrl != null) 'preuvesUrl': preuvesUrl,
    });
    return Map<String, dynamic>.from(r['data'] as Map);
  }

  static Future<List<dynamic>> listerLitiges() async {
    final r = await ApiClient.get('/innovations/litiges');
    return (r['data'] as List?) ?? [];
  }

  static Future<Map<String, dynamic>> fileTerrain() async {
    final r = await ApiClient.get('/innovations/terrain/file');
    return Map<String, dynamic>.from(r['data'] as Map);
  }

  static Future<Map<String, dynamic>> appelerProchain() async {
    final r = await ApiClient.post('/innovations/terrain/appeler-prochain', body: {});
    return Map<String, dynamic>.from(r['data'] as Map);
  }

  static Future<Map<String, dynamic>> statsAgent() async {
    final r = await ApiClient.get('/innovations/agents/moi');
    return Map<String, dynamic>.from(r['data'] as Map);
  }

  static Future<List<dynamic>> packagesCorridors() async {
    final r = await ApiClient.get('/packages', params: {'corridors': '1'});
    final data = r['data'];
    if (data is List) return data;
    return [];
  }
}
