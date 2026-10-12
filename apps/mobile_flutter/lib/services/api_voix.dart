import 'api_client.dart';

class ApiVoix {
  static Future<Map<String, dynamic>> token({
    String? conversationId,
    String? reservationId,
  }) async {
    final data = await ApiClient.post('/voix/token', body: {
      if (conversationId != null) 'conversationId': conversationId,
      if (reservationId != null) 'reservationId': reservationId,
    });
    return data as Map<String, dynamic>;
  }
}
