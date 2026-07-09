import 'api_client.dart';
import '../models/models.dart';

class ApiPaiements {
  static Future<Map<String, dynamic>> initierPaiement({
    required String reservationId,
    required String operateur,
    required double montant,
    String? telephonePaiement,
    bool acompteUniquement = false,
  }) async {
    return (await ApiClient.post('/paiements', body: {
      'reservationId': reservationId,
      'operateur': operateur,
      'montant': montant,
      if (telephonePaiement != null) 'telephonePaiement': telephonePaiement,
      'acompteUniquement': acompteUniquement,
    })) as Map<String, dynamic>;
  }

  static Future<List<Transaction>> listerTransactions(String reservationId) async {
    final data = await ApiClient.get('/paiements/reservations/$reservationId/transactions');
    final items = (data is Map ? data['donnees'] as List<dynamic>? : data as List<dynamic>?) ?? [];
    return items.map((e) => Transaction.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<Map<String, dynamic>> obtenirRecu(String reservationId) async {
    return (await ApiClient.get('/paiements/reservations/$reservationId/recu')) as Map<String, dynamic>;
  }
}
