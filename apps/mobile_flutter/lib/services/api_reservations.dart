import 'api_client.dart';
import '../models/models.dart';

class ApiReservations {
  static Future<ReservationDetaillee> creerReservation({
    required String serviceId,
    required String creneauId,
    String? notes,
    bool reservePourTiers = false,
    String? nomTiers,
    String? telephoneTiers,
  }) async {
    final data = await ApiClient.post('/reservations', body: {
      'serviceId': serviceId,
      'creneauId': creneauId,
      if (notes != null) 'notes': notes,
      'reservePourTiers': reservePourTiers,
      if (nomTiers != null) 'nomTiers': nomTiers,
      if (telephoneTiers != null) 'telephoneTiers': telephoneTiers,
    });
    return ReservationDetaillee.fromJson(data);
  }

  static Future<List<ReservationDetaillee>> listerMesReservations({String? statut}) async {
    final params = <String, String>{};
    if (statut != null) params['statut'] = statut;
    final data = await ApiClient.get('/reservations/moi', params: params.isNotEmpty ? params : null);
    final List<dynamic> items;
    if (data is Map && data.containsKey('items')) {
      items = data['items'] as List<dynamic>? ?? [];
    } else if (data is List) {
      items = data;
    } else {
      items = [];
    }
    if (items.isNotEmpty) {
      return items.map((e) => ReservationDetaillee.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  static Future<ReservationDetaillee> obtenirDetail(String reservationId) async {
    final data = await ApiClient.get('/reservations/$reservationId');
    return ReservationDetaillee.fromJson(data);
  }

  static Future<Map<String, dynamic>> annulerReservation(String reservationId, {String? motif}) async {
    return (await ApiClient.post('/reservations/annuler', body: {
      'reservationId': reservationId,
      if (motif != null) 'motif': motif,
    })) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> modifierReservation(String reservationId, String nouveauCreneauId) async {
    return (await ApiClient.post('/reservations/modifier', body: {
      'reservationId': reservationId,
      'nouveauCreneauId': nouveauCreneauId,
    })) as Map<String, dynamic>;
  }
}
