import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config.dart';
import 'api_client.dart';

class SocketService {
  io.Socket? _socket;
  bool _connecte = false;
  final Set<String> _rooms = {};
  final _messageController = StreamController<Map<String, dynamic>>.broadcast();
  final _typingController = StreamController<Map<String, dynamic>>.broadcast();
  final _messagesLusController = StreamController<Map<String, dynamic>>.broadcast();
  final _erreurController = StreamController<String>.broadcast();

  Stream<Map<String, dynamic>> get messages => _messageController.stream;
  Stream<Map<String, dynamic>> get typing => _typingController.stream;
  Stream<Map<String, dynamic>> get messagesLus => _messagesLusController.stream;
  Stream<String> get erreurs => _erreurController.stream;
  bool get connecte => _connecte;

  static final SocketService _instance = SocketService._();
  factory SocketService() => _instance;
  SocketService._();

  Future<void> connecter() async {
    if (_connecte) return;
    final token = await ApiClient.getToken();
    if (token == null) return;

    final origin = Uri.parse(AppConfig.apiUrl).origin;

    _socket = io.io(origin, <String, dynamic>{
      'transports': ['websocket'],
      'auth': {'token': token},
      'autoConnect': true,
      'reconnection': true,
      'reconnectionAttempts': 10,
      'reconnectionDelay': 2000,
    });

    _socket!.onConnect((_) {
      _connecte = true;
      for (final room in _rooms) {
        _socket!.emit('rejoindre-conversation', {'conversationId': room});
      }
    });

    _socket!.onDisconnect((_) {
      _connecte = false;
    });

    _socket!.onConnectError((_) {
      _connecte = false;
    });

    _socket!.on('nouveau-message', (data) {
      _messageController.add(data as Map<String, dynamic>);
    });

    _socket!.on('tape', (data) {
      _typingController.add(data as Map<String, dynamic>);
    });

    _socket!.on('messages-lus', (data) {
      _messagesLusController.add(data as Map<String, dynamic>);
    });

    _socket!.on('erreur', (msg) {
      _erreurController.add(msg as String);
    });

    _socket!.connect();
  }

  void rejoindreConversation(String conversationId) {
    _rooms.add(conversationId);
    if (_connecte) {
      _socket!.emit('rejoindre-conversation', {'conversationId': conversationId});
    }
  }

  void quitterConversation(String conversationId) {
    _rooms.remove(conversationId);
    if (_connecte) {
      _socket!.emit('quitter-conversation', {'conversationId': conversationId});
    }
  }

  void envoyerMessage(String conversationId, String contenu, {String? imageUrl}) {
    if (!_connecte) return;
    _socket!.emit('message-ecrit', {
      'conversationId': conversationId,
      'contenu': contenu,
      if (imageUrl != null) 'imageUrl': imageUrl,
    });
  }

  void envoyerTape(String conversationId) {
    if (!_connecte) return;
    _socket!.emit('tape', {'conversationId': conversationId});
  }

  void marquerLu(String conversationId) {
    if (!_connecte) return;
    _socket!.emit('marquer-lu', conversationId);
  }

  void deconnecter() {
    _rooms.clear();
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _connecte = false;
  }

  void dispose() {
    deconnecter();
    _messageController.close();
    _typingController.close();
    _messagesLusController.close();
    _erreurController.close();
  }
}
