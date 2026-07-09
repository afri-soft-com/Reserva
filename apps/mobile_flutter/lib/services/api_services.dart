import 'api_client.dart';
import '../models/models.dart';

class ApiServices {
  static Future<List<ServiceAvecPrestataire>> rechercherServices({
    String? categorie,
    String? ville,
    String? texte,
    String? tri,
    double? prixMin,
    double? prixMax,
    int page = 1,
    int parPage = 20,
  }) async {
    final params = <String, String>{
      'page': page.toString(),
      'parPage': parPage.toString(),
    };
    if (categorie != null) params['categorie'] = categorie;
    if (ville != null) params['ville'] = ville;
    if (texte != null) params['texte'] = texte;
    if (tri != null) params['tri'] = tri;
    if (prixMin != null) params['prixMin'] = prixMin.toStringAsFixed(0);
    if (prixMax != null) params['prixMax'] = prixMax.toStringAsFixed(0);

    final data = await ApiClient.get('/services', params: params);
    final items = (data['items'] as List<dynamic>?) ?? [];
    return items.map((e) => ServiceAvecPrestataire.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<Map<String, dynamic>> obtenirDetailService(String serviceId) async {
    return (await ApiClient.get('/services/$serviceId')) as Map<String, dynamic>;
  }
}
