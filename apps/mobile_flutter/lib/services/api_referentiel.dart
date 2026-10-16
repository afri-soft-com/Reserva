import 'api_client.dart';

class ApiReferentiel {
  static List<String>? _cacheVilles;

  static Future<List<String>> listerVilles({bool force = false}) async {
    if (!force && _cacheVilles != null && _cacheVilles!.isNotEmpty) {
      return _cacheVilles!;
    }
    final data = await ApiClient.get('/referentiel/villes');
    final list = (data is Map ? data['villes'] as List? : data as List?) ?? [];
    _cacheVilles = list.map((e) => e.toString()).toList()..sort((a, b) => a.compareTo(b));
    return _cacheVilles!;
  }
}
