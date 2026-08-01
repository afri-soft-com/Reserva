import 'api_client.dart';
import '../models/models.dart';

class ApiAvis {
  static Future<Map<String, dynamic>> creerAvis({
    required String reservationId,
    required int note,
    String? commentaire,
    List<String>? photosUrl,
  }) async {
    return (await ApiClient.post('/avis', body: {
      'reservationId': reservationId,
      'note': note,
      if (commentaire != null && commentaire.isNotEmpty) 'commentaire': commentaire,
      if (photosUrl != null && photosUrl.isNotEmpty) 'photosUrl': photosUrl,
    })) as Map<String, dynamic>;
  }

  static Future<List<Avis>> listerMesAvis() async {
    final data = await ApiClient.get('/avis/moi');
    if (data is Map && data.containsKey('donnees')) {
      final items = data['donnees'] as List<dynamic>? ?? [];
      return items.map((e) => Avis.fromJson(e as Map<String, dynamic>)).toList();
    }
    if (data is List) {
      return data.map((e) => Avis.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }
}
