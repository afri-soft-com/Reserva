import 'api_client.dart';
import '../models/models.dart';

class ApiFavoris {
  static Future<List<ServiceAvecPrestataire>> listerFavoris({int page = 1, int parPage = 20}) async {
    final data = await ApiClient.get('/favoris?page=$page&parPage=$parPage');
    final List<dynamic> items;
    if (data is Map && data.containsKey('items')) {
      items = data['items'] as List<dynamic>? ?? [];
    } else if (data is List) {
      items = data;
    } else if (data is Map && data.containsKey('donnees')) {
      final donnees = data['donnees'];
      items = donnees is Map && donnees.containsKey('items')
          ? donnees['items'] as List<dynamic>? ?? []
          : donnees as List<dynamic>? ?? [];
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

  static Future<int> compterFavoris() async {
    try {
      final data = await ApiClient.get('/favoris?page=1&parPage=1');
      if (data is Map) {
        final total = data['total'];
        if (total is num) return total.toInt();
      }
    } catch (_) {}
    return 0;
  }

  static Future<ResultatPaginationFavoris> listerFavorisPage({int page = 1, int parPage = 20}) async {
    final data = await ApiClient.get('/favoris?page=$page&parPage=$parPage');
    final List<dynamic> items;
    int total = 0;
    if (data is Map && data.containsKey('items')) {
      items = data['items'] as List<dynamic>? ?? [];
      total = (data['total'] as num?)?.toInt() ?? items.length;
    } else if (data is List) {
      items = data;
      total = items.length;
    } else {
      items = [];
    }
    final services = items.map((e) {
      final serviceData = e is Map && e.containsKey('service')
          ? e['service'] as Map<String, dynamic>
          : e as Map<String, dynamic>;
      return ServiceAvecPrestataire.fromJson(serviceData);
    }).toList();
    return ResultatPaginationFavoris(services: services, total: total);
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

class ResultatPaginationFavoris {
  final List<ServiceAvecPrestataire> services;
  final int total;
  ResultatPaginationFavoris({required this.services, required this.total});
}
