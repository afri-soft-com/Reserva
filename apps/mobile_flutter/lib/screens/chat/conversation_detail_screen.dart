import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../config.dart';
import '../../theme.dart';
import '../../services/api_chat.dart';
import '../../services/api_client.dart';
import '../../services/socket_service.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/toast.dart';

class ConversationDetailScreen extends StatefulWidget {
  final String conversationId;

  const ConversationDetailScreen({super.key, required this.conversationId});

  @override
  State<ConversationDetailScreen> createState() => _ConversationDetailScreenState();
}

class _ConversationDetailScreenState extends State<ConversationDetailScreen> {
  final _textCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final _socket = SocketService();
  final _picker = ImagePicker();
  List<Map<String, dynamic>> _messages = [];
  bool _chargement = true;
  bool _envoi = false;
  bool _uploadImage = false;
  String? _tapeUserId;
  Timer? _tapeTimer;
  StreamSubscription? _subMessage;
  StreamSubscription? _subTyping;
  StreamSubscription? _subMessagesLus;
  StreamSubscription? _subErreur;

  @override
  void initState() {
    super.initState();
    _initialiser();
  }

  Future<void> _initialiser() async {
    await _socket.connecter();
    _socket.rejoindreConversation(widget.conversationId);
    _subMessage = _socket.messages.listen(_onMessage);
    _subTyping = _socket.typing.listen(_onTyping);
    _subMessagesLus = _socket.messagesLus.listen((data) {
      if (!mounted) return;
      setState(() {
        for (final m in _messages) {
          if (m['envoyeur'] is Map<String, dynamic> &&
              (m['envoyeur'] as Map<String, dynamic>)['id'] != data['utilisateurId']) {
            m['lu'] = true;
          }
        }
      });
    });
    _subErreur = _socket.erreurs.listen((msg) {
      if (mounted) ToastWidget.show(context, msg, type: 'erreur');
    });
    await _chargerMessages();
  }

  @override
  void dispose() {
    _textCtrl.dispose();
    _scrollCtrl.dispose();
    _socket.quitterConversation(widget.conversationId);
    _subMessage?.cancel();
    _subTyping?.cancel();
    _subMessagesLus?.cancel();
    _subErreur?.cancel();
    _tapeTimer?.cancel();
    super.dispose();
  }

  void _onMessage(Map<String, dynamic> data) {
    if (!mounted) return;
    setState(() => _messages.add(data));
    Future.delayed(const Duration(milliseconds: 100), _defilerVersBas);
  }

  void _onTyping(Map<String, dynamic> data) {
    if (!mounted) return;
    final userId = data['utilisateurId'] as String?;
    if (userId == null) return;
    final auth = context.read<AuthProvider>();
    if (userId == auth.utilisateur?.id) return;
    _tapeTimer?.cancel();
    setState(() => _tapeUserId = userId);
    _tapeTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() { _tapeUserId = null; });
    });
  }

  Future<void> _chargerMessages({bool marquerLu = true}) async {
    try {
      final data = await ApiChat.listerMessages(widget.conversationId);
      final items = (data['items'] as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
      if (mounted) {
        setState(() => _messages = items);
        if (marquerLu) {
          await ApiChat.marquerLu(widget.conversationId);
          _socket.marquerLu(widget.conversationId);
        }
        Future.delayed(const Duration(milliseconds: 100), _defilerVersBas);
      }
    } catch (_) {
    } finally {
      if (mounted && _chargement) setState(() => _chargement = false);
    }
  }

  void _defilerVersBas() {
    if (_scrollCtrl.hasClients) {
      _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent, duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
    }
  }

  Future<void> _choisirImage() async {
    final xfile = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 80, maxWidth: 1200);
    if (xfile == null) return;
    setState(() => _uploadImage = true);
    try {
      final url = await ApiClient.uploadImage(xfile.path);
      _envoyerMessage(imageUrl: url);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _uploadImage = false);
    }
  }

  void _envoyerMessage({String? imageUrl}) {
    final contenu = _textCtrl.text.trim();
    if (contenu.isEmpty && imageUrl == null) return;
    setState(() => _envoi = true);
    if (_socket.connecte) {
      _socket.envoyerMessage(widget.conversationId, contenu, imageUrl: imageUrl);
      _textCtrl.clear();
    } else {
      ApiChat.envoyerMessage(widget.conversationId, contenu, imageUrl: imageUrl).then((_) {
        _textCtrl.clear();
        _chargerMessages(marquerLu: false);
      }).catchError((e) {
        if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
      });
    }
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) setState(() => _envoi = false);
    });
  }

  void _onChanged(String val) {
    setState(() {});
    if (val.isNotEmpty) {
      _socket.envoyerTape(widget.conversationId);
    }
  }

  String _formaterDate(String dateStr) {
    try {
      final d = DateTime.parse(dateStr);
      final now = DateTime.now();
      if (d.year == now.year && d.month == now.month && d.day == now.day) {
        return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
      }
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return dateStr.substring(0, 10);
    }
  }

  String _resoudreImage(String url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    final origin = Uri.parse(AppConfig.apiUrl).origin;
    return '$origin$url';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final userId = auth.utilisateur?.id ?? '';

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Conversation')),
      body: Column(
        children: [
          Expanded(
            child: _chargement
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.chat, size: 48, color: AppCouleurs.texteSecondaire),
                            SizedBox(height: 12),
                            Text('Aucun message',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                            SizedBox(height: 4),
                            Text('Envoyez le premier message !',
                                style: TextStyle(color: AppCouleurs.texteSecondaire)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.only(bottom: 8, left: 16, right: 16, top: 16),
                        itemCount: _messages.length,
                        itemBuilder: (_, i) {
                          final m = _messages[i];
                          final envoyeur = m['envoyeur'] as Map<String, dynamic>? ?? {};
                          final estMoi = envoyeur['id'] == userId;
                          final contenu = m['contenu'] as String? ?? '';
                          final imageUrl = m['imageUrl'] as String?;
                          final date = m['creeLe'] as String? ?? '';
                          final nom = envoyeur['nom'] as String? ?? '';

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Column(
                              crossAxisAlignment: estMoi ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                              children: [
                                if (!estMoi)
                                  Padding(
                                    padding: const EdgeInsets.only(left: 4, bottom: 2),
                                    child: Text(nom,
                                        style: const TextStyle(fontSize: 11,
                                            color: AppCouleurs.texteSecondaire,
                                            fontWeight: FontWeight.w600)),
                                  ),
                                Container(
                                  constraints: BoxConstraints(
                                    maxWidth: MediaQuery.of(context).size.width * 0.75,
                                  ),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: estMoi ? AppCouleurs.primaire : AppCouleurs.blanc,
                                    borderRadius: BorderRadius.only(
                                      topLeft: const Radius.circular(16),
                                      topRight: const Radius.circular(16),
                                      bottomLeft: Radius.circular(estMoi ? 16 : 4),
                                      bottomRight: Radius.circular(estMoi ? 4 : 16),
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.04),
                                        blurRadius: 4,
                                        offset: const Offset(0, 1),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      if (imageUrl != null)
                                        Padding(
                                          padding: const EdgeInsets.only(bottom: 4),
                                          child: ClipRRect(
                                            borderRadius: BorderRadius.circular(8),
                                            child: GestureDetector(
                                              onTap: () => _afficherImage(context, imageUrl),
                                              child: Image.network(
                                                _resoudreImage(imageUrl),
                                                fit: BoxFit.cover,
                                                width: double.infinity,
                                                loadingBuilder: (_, child, progress) {
                                                  if (progress == null) return child;
                                                  return Container(
                                                    height: 120,
                                                    color: Colors.black12,
                                                    child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                                                  );
                                                },
                                                errorBuilder: (_, __, ___) => Container(
                                                  height: 120,
                                                  color: Colors.black12,
                                                  child: const Center(child: Icon(Icons.broken_image, size: 32, color: Colors.grey)),
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),
                                      if (contenu.isNotEmpty)
                                        Text(contenu,
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: estMoi ? AppCouleurs.blanc : AppCouleurs.texte,
                                            )),
                                      const SizedBox(height: 2),
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(_formaterDate(date),
                                              style: TextStyle(
                                                fontSize: 10,
                                                color: estMoi
                                                    ? AppCouleurs.blanc.withValues(alpha: 0.7)
                                                    : AppCouleurs.texteSecondaire,
                                              )),
                                          if (estMoi) ...[
                                            const SizedBox(width: 4),
                                            Icon(
                                              (m['lu'] as bool? ?? false) ? Icons.done_all : Icons.done,
                                              size: 13,
                                              color: estMoi
                                                  ? ((m['lu'] as bool? ?? false) ? const Color(0xFFB7E3FA) : AppCouleurs.blanc.withValues(alpha: 0.6))
                                                  : AppCouleurs.texteSecondaire,
                                            ),
                                          ],
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
          if (_tapeUserId != null)
            Container(
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.only(left: 16, bottom: 4),
              child: Text('tape...',
                  style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire, fontStyle: FontStyle.italic)),
            ),
          if (_uploadImage)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(width: 8),
                  Text('Envoi de l\'image...', style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                ],
              ),
            ),
          Container(
            decoration: BoxDecoration(
              color: AppCouleurs.blanc,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, -1),
                ),
              ],
            ),
            padding: EdgeInsets.only(
              left: 4, right: 12, top: 8,
              bottom: MediaQuery.of(context).padding.bottom + 8,
            ),
            child: Row(
              children: [
                GestureDetector(
                  onTap: _uploadImage ? null : _choisirImage,
                  child: Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: AppCouleurs.fond,
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Icon(Icons.image_outlined, color: AppCouleurs.texteSecondaire, size: 22),
                  ),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: TextField(
                    controller: _textCtrl,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _envoyerMessage(),
                    onChanged: _onChanged,
                    decoration: InputDecoration(
                      hintText: 'Écrivez un message...',
                      filled: true,
                      fillColor: AppCouleurs.fond,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _envoi ? null : () => _envoyerMessage(),
                  child: Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: (_textCtrl.text.trim().isEmpty) ? AppCouleurs.bordure : AppCouleurs.primaire,
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: _envoi
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppCouleurs.blanc),
                          )
                        : const Icon(Icons.send, color: AppCouleurs.blanc, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _afficherImage(BuildContext context, String url) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            title: const Text('Image'),
          ),
          body: Center(
            child: InteractiveViewer(
              child: Image.network(
                _resoudreImage(url),
                fit: BoxFit.contain,
                loadingBuilder: (_, child, progress) {
                  if (progress == null) return child;
                  return const Center(child: CircularProgressIndicator(color: Colors.white));
                },
                errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, color: Colors.white, size: 64),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
