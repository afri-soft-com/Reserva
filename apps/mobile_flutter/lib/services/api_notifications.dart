import 'api_client.dart';

class NotificationItem {
  final String id;
  final String titre;
  final String message;
  final String type;
  final bool lu;
  final String? reservationId;
  final String creeLe;

  NotificationItem({
    required this.id,
    required this.titre,
    required this.message,
    required this.type,
    required this.lu,
    this.reservationId,
    required this.creeLe,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) => NotificationItem(
    id: json['id'] as String,
    titre: json['titre'] as String,
    message: json['message'] as String,
    type: json['type'] as String,
    lu: json['lu'] as bool? ?? false,
    reservationId: json['reservationId'] as String?,
    creeLe: json['creeLe'] as String,
  );
}

class ApiNotifications {
  static Future<List<NotificationItem>> lister({bool? nonLues}) async {
    final params = <String, String>{};
    if (nonLues == true) params['nonLues'] = 'true';
    final data = await ApiClient.get('/notifications', params: params.isNotEmpty ? params : null);
    final items = (data is Map ? data['donnees'] as List<dynamic>? : data as List<dynamic>?) ?? [];
    return items.map((e) => NotificationItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<int> compteur() async {
    final data = await ApiClient.get('/notifications/compteur');
    if (data is Map) return data['total'] as int? ?? 0;
    return 0;
  }

  static Future<void> marquerLue(String notificationId) async {
    await ApiClient.patch('/notifications/$notificationId/lue');
  }

  static Future<void> marquerToutesLues() async {
    await ApiClient.patch('/notifications/toutes-lues');
  }

  static Future<void> supprimer(String notificationId) async {
    await ApiClient.delete('/notifications/$notificationId');
  }
}
