import 'api_client.dart';
import '../models/models.dart';

class ApiFavoris {
  static Future<List<ServiceAvecPrestataire>> listerFavoris() async {
    final data = await ApiClient.get('/favoris');
    final List<dynamic> items;
    if (data is Map && data.containsKey('items')) {
      items = data['items'] as List<dynamic>? ?? [];
    } else if (data is List) {
      items = data;
    } else if (data is Map && data.containsKey('donnees')) {
      items = data['donnees'] as List<dynamic>? ?? [];
    } else {
      items = [];
    }
    if (items.isEmpty) return [];
    return items.map((e) {
      final serviceData = e is Map && e.containsKey('service')
          ? e['service'] as Map<String, dynamic>
          : e as Map<String, dynamic>;
      return ServiceAvecPrestataire.fromJson(serviceData);
    }).toList();
  }

  static Future<Map<String, dynamic>> ajouterFavori(String serviceId) async {
    return (await ApiClient.post('/favoris/$serviceId')) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> supprimerFavori(String serviceId) async {
    return (await ApiClient.delete('/favoris/$serviceId')) as Map<String, dynamic>;
  }

  static Future<Set<String>> obtenirIdsFavoris() async {
    try {
      final services = await listerFavoris();
      return services.map((s) => s.id).toSet();
    } catch (_) {
      return {};
    }
  }
}
