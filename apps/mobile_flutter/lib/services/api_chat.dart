import 'api_client.dart';

class ApiChat {
  static Future<List<dynamic>> listerConversations({int page = 1, int parPage = 50}) async {
    final data = await ApiClient.get('/chat/conversations', params: {
      'page': '$page', 'parPage': '$parPage',
    });
    return (data as Map<String, dynamic>)['items'] as List<dynamic>;
  }

  static Future<Map<String, dynamic>> creerConversation(String participantId, {String? sujet}) async {
    final data = await ApiClient.post('/chat/conversations', body: {
      'participantId': participantId,
      if (sujet != null) 'sujet': sujet,
    });
    return data as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> contacterAdmin() async {
    final data = await ApiClient.post('/chat/conversations/admin');
    return data as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> listerMessages(String conversationId, {int page = 1, int parPage = 100}) async {
    final data = await ApiClient.get('/chat/conversations/$conversationId/messages', params: {
      'page': '$page', 'parPage': '$parPage',
    });
    return data as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> envoyerMessage(String conversationId, String contenu, {String? imageUrl}) async {
    final data = await ApiClient.post('/chat/conversations/$conversationId/messages', body: {
      'contenu': contenu,
      if (imageUrl != null) 'imageUrl': imageUrl,
    });
    return data as Map<String, dynamic>;
  }

  static Future<void> marquerLu(String conversationId) async {
    await ApiClient.patch('/chat/conversations/$conversationId/lire');
  }
}
