import 'api_client.dart';
import '../models/models.dart';

class ApiFidelite {
  static Future<Map<String, dynamic>> obtenirSolde() async {
    return (await ApiClient.get('/fidelite/solde')) as Map<String, dynamic>;
  }

  static Future<ResultatPagine<PointTransaction>> obtenirHistorique({int page = 1, int parPage = 20}) async {
    final data = await ApiClient.get('/fidelite/historique', params: {
      'page': '$page', 'parPage': '$parPage',
    }) as Map<String, dynamic>;
    return ResultatPagine(
      items: (data['items'] as List<dynamic>? ?? []).map((e) => PointTransaction.fromJson(e as Map<String, dynamic>)).toList(),
      total: data['total'] as int? ?? 0,
      page: data['page'] as int? ?? page,
      parPage: data['parPage'] as int? ?? parPage,
      totalPages: data['totalPages'] as int? ?? 0,
    );
  }
}
