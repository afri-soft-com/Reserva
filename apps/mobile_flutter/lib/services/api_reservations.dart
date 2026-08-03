import 'api_client.dart';
import 'cache_hors_ligne.dart';
import '../models/models.dart';

class ApiReservations {
  static bool horsLigne = false;
  static DateTime? cacheSauvegardeLe;
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

  static Future<Map<String, dynamic>> creerReservationRecurrente({
    required String serviceId,
    required String creneauId,
    required int nombreOccurrences,
    String? notes,
  }) async {
    return (await ApiClient.post('/reservations/recurrentes', body: {
      'serviceId': serviceId,
      'creneauId': creneauId,
      'nombreOccurrences': nombreOccurrences,
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes,
    })) as Map<String, dynamic>;
  }

  static Future<List<ReservationDetaillee>> listerMesReservations({String? statut}) async {
    final params = <String, String>{};
    if (statut != null) params['statut'] = statut;
    try {
      final data = await ApiClient.get('/reservations/moi', params: params.isNotEmpty ? params : null);
      final items = _extraireItems(data);
      if (statut == null) {
        await CacheHorsLigne.sauvegarder('reservations_client', {'items': items});
      }
      horsLigne = false;
      return items.map((e) => ReservationDetaillee.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      final cache = await CacheHorsLigne.lire('reservations_client');
      if (cache != null && cache['items'] is List) {
        horsLigne = true;
        cacheSauvegardeLe = await CacheHorsLigne.dateSauvegarde('reservations_client');
        var items = (cache['items'] as List).cast<Map<String, dynamic>>();
        if (statut != null) {
          items = items.where((e) => e['statut'] == statut).toList();
        }
        return items.map((e) => ReservationDetaillee.fromJson(e)).toList();
      }
      rethrow;
    }
  }

  static List<dynamic> _extraireItems(dynamic data) {
    if (data is Map && data.containsKey('items')) {
      return data['items'] as List<dynamic>? ?? [];
    }
    if (data is List) return data;
    return [];
  }

  static Future<ReservationDetaillee> obtenirDetail(String reservationId) async {
    final data = await ApiClient.get('/reservations/$reservationId');
    return ReservationDetaillee.fromJson(data);
  }

  static Future<Map<String, dynamic>> annulerReservation(String reservationId, {String? motif, String modeRemboursement = 'AVOIR'}) async {
    return (await ApiClient.post('/reservations/annuler', body: {
      'reservationId': reservationId,
      'modeRemboursement': modeRemboursement,
      if (motif != null) 'motif': motif,
    })) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> reproduireReservation(String reservationId) async {
    return (await ApiClient.post('/reservations/reproduire', body: {
      'reservationId': reservationId,
    })) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> modifierReservation(String reservationId, String nouveauCreneauId) async {
    return (await ApiClient.post('/reservations/modifier', body: {
      'reservationId': reservationId,
      'nouveauCreneauId': nouveauCreneauId,
    })) as Map<String, dynamic>;
  }
}
