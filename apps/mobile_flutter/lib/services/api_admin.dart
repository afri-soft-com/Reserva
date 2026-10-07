import 'api_client.dart';

class ApiAdmin {
  static Future<Map<String, dynamic>> obtenirStatistiques({String? periode, String? ville, String? categorie}) async {
    return (await ApiClient.get('/admin/statistiques', params: {
      if (periode != null && periode.isNotEmpty) 'periode': periode,
      if (ville != null && ville.isNotEmpty) 'ville': ville,
      if (categorie != null && categorie.isNotEmpty) 'categorie': categorie,
    })) as Map<String, dynamic>;
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
    return (await ApiClient.put('/admin/plans/$id', body: body)) as Map<String, dynamic>;
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

  static Future<Map<String, dynamic>> obtenirKyc(String prestataireId) async {
    return (await ApiClient.get('/prestataires/admin/$prestataireId/kyc')) as Map<String, dynamic>;
  }

  static Future<void> reviserKyc({
    required String prestataireId,
    required String decision,
    String? motif,
    bool approuverProfil = true,
  }) async {
    await ApiClient.post('/prestataires/admin/kyc/reviser', body: {
      'prestataireId': prestataireId,
      'decision': decision,
      if (motif != null && motif.isNotEmpty) 'motif': motif,
      'approuverProfil': approuverProfil,
    });
  }

  static Future<Map<String, dynamic>> obtenirExigenceDocuments() async {
    return (await ApiClient.get('/admin/exigence-documents')) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> enregistrerExigenceDocuments(Map<String, dynamic> body) async {
    return (await ApiClient.put('/admin/exigence-documents', body: body)) as Map<String, dynamic>;
  }

  static Future<String> telechargerExportCsv(String type) async {
    return ApiClient.getTexte('/admin/export/$type');
  }

  static Future<Map<String, dynamic>> envoyerBroadcast({required String titre, required String message, String? role}) async {
    return (await ApiClient.post('/admin/notifications/broadcast', body: {
      'titre': titre,
      'message': message,
      if (role != null && role.isNotEmpty) 'role': role,
    })) as Map<String, dynamic>;
  }
}
