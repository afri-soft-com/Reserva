import 'api_client.dart';

class ApiAvoirs {
  static Future<Map<String, dynamic>> obtenirMesAvoirs() async {
    return (await ApiClient.get('/avoirs/moi')) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> appliquerAvoir({
    required String reservationId,
    double? montant,
  }) async {
    return (await ApiClient.post('/avoirs/appliquer', body: {
      'reservationId': reservationId,
      if (montant != null) 'montant': montant,
    })) as Map<String, dynamic>;
  }
}
