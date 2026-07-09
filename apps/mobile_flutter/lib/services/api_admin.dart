import 'api_client.dart';

class ApiAdmin {
  static Future<Map<String, dynamic>> obtenirStatistiques() async {
    return (await ApiClient.get('/admin/statistiques')) as Map<String, dynamic>;
  }

  static Future<List<dynamic>> listerPlans({int page = 1, int parPage = 50}) async {
    final data = await ApiClient.get('/admin/plans', params: {'page': page.toString(), 'parPage': parPage.toString()});
    if (data is Map && data.containsKey('items')) return data['items'] as List<dynamic>? ?? [];
    return [];
  }

  static Future<Map<String, dynamic>> creerPlan(Map<String, dynamic> body) async {
    return (await ApiClient.post('/admin/plans', body: body)) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> modifierPlan(String id, Map<String, dynamic> body) async {
    return (await ApiClient.patch('/admin/plans/$id', body: body)) as Map<String, dynamic>;
  }

  static Future<void> supprimerPlan(String id) async {
    await ApiClient.request('DELETE', '/admin/plans/$id');
  }

  static Future<List<dynamic>> listerAbonnements({int page = 1, int parPage = 20}) async {
    final data = await ApiClient.get('/admin/abonnements', params: {'page': page.toString(), 'parPage': parPage.toString()});
    if (data is Map && data.containsKey('items')) return data['items'] as List<dynamic>? ?? [];
    return [];
  }

  static Future<List<dynamic>> listerConfigurations({int page = 1, int parPage = 50}) async {
    final data = await ApiClient.get('/admin/tarifications', params: {'page': page.toString(), 'parPage': parPage.toString()});
    if (data is Map && data.containsKey('items')) return data['items'] as List<dynamic>? ?? [];
    return [];
  }

  static Future<Map<String, dynamic>> creerOuModifierConfig(Map<String, dynamic> body) async {
    return (await ApiClient.post('/admin/tarifications', body: body)) as Map<String, dynamic>;
  }

  static Future<void> supprimerConfig(String id) async {
    await ApiClient.request('DELETE', '/admin/tarifications/$id');
  }

  static Future<List<dynamic>> listerPrestataires({int page = 1, int parPage = 20}) async {
    final data = await ApiClient.get('/admin/prestataires', params: {'page': page.toString(), 'parPage': parPage.toString()});
    if (data is Map && data.containsKey('items')) return data['items'] as List<dynamic>? ?? [];
    return [];
  }

  static Future<List<dynamic>> listerUtilisateurs({int page = 1, int parPage = 20}) async {
    final data = await ApiClient.get('/admin/utilisateurs', params: {'page': page.toString(), 'parPage': parPage.toString()});
    if (data is Map && data.containsKey('items')) return data['items'] as List<dynamic>? ?? [];
    return [];
  }

  static Future<void> suspendrePrestataire(String prestataireId) async {
    await ApiClient.post('/admin/prestataires/$prestataireId/suspendre');
  }

  static Future<void> validerPrestataire(String prestataireId, bool approuver, String? motifRejet) async {
    await ApiClient.post('/prestataires/admin/valider', body: {
      'prestataireId': prestataireId,
      'approuver': approuver,
      if (motifRejet != null && motifRejet.isNotEmpty) 'motifRejet': motifRejet,
    });
  }
}
