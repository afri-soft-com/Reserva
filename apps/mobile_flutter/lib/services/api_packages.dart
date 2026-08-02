import 'api_client.dart';

class ApiPackages {
  static Future<Map<String, dynamic>> creerPackage({
    required String nom,
    required double prix,
    String devise = 'CDF',
    String? description,
    required List<String> serviceIds,
  }) async {
    return (await ApiClient.post('/packages', body: {
      'nom': nom,
      'prix': prix,
      'devise': devise,
      if (description != null && description.isNotEmpty) 'description': description,
      'serviceIds': serviceIds,
    })) as Map<String, dynamic>;
  }

  static Future<List<dynamic>> mesPackages() async {
    final data = await ApiClient.get('/packages/moi/packages');
    if (data is List) return data;
    if (data is Map && data.containsKey('packages')) return data['packages'] as List<dynamic>? ?? [];
    return [];
  }

  static Future<Map<String, dynamic>> modifierPackage(String packageId, Map<String, dynamic> body) async {
    return (await ApiClient.patch('/packages/$packageId', body: body)) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> supprimerPackage(String packageId) async {
    return (await ApiClient.delete('/packages/$packageId')) as Map<String, dynamic>;
  }

  static Future<List<dynamic>> listerPublics({String? prestataireId}) async {
    final params = <String, String>{};
    if (prestataireId != null) params['prestataireId'] = prestataireId;
    final data = await ApiClient.get('/packages', params: params.isNotEmpty ? params : null);
    if (data is List) return data;
    return [];
  }

  static Future<Map<String, dynamic>> detailPublic(String packageId) async {
    return (await ApiClient.get('/packages/$packageId')) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> reserverPackage({
    required String packageId,
    required List<Map<String, String>> items,
  }) async {
    return (await ApiClient.post('/packages/reserver', body: {
      'packageId': packageId,
      'items': items,
    })) as Map<String, dynamic>;
  }
}
