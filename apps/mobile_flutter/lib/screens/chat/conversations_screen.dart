import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../services/api_chat.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({super.key});

  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  List<dynamic> _conversations = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    try {
      final data = await ApiChat.listerConversations();
      if (mounted) setState(() => _conversations = data);
    } catch (_) {
      if (mounted) ToastWidget.show(context, 'Erreur de chargement', type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final userId = auth.utilisateur?.id ?? '';

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Messages')),
      body: RefreshIndicator(
        onRefresh: _charger,
        color: AppCouleurs.primaire,
        child: _chargement
            ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
            : _conversations.isEmpty
                ? ListView(
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                      Center(
                        child: Column(
                          children: [
                            Icon(Icons.chat_bubble_outline, size: 64, color: AppCouleurs.texteSecondaire),
                            const SizedBox(height: 16),
                            const Text('Aucune conversation',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 8),
                            const Text('Contactez un prestataire ou l\'administration.',
                                style: TextStyle(color: AppCouleurs.texteSecondaire)),
                          ],
                        ),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _conversations.length,
                    itemBuilder: (_, i) {
                      final c = _conversations[i] as Map<String, dynamic>;
                      final participants = c['participants'] as List<dynamic>? ?? [];
                      final autre = participants.firstWhere(
                        (p) => (p as Map<String, dynamic>)['utilisateur']['id'] != userId,
                        orElse: () => participants.isNotEmpty ? participants[0] : null,
                      ) as Map<String, dynamic>?;
                      final autreUser = autre?['utilisateur'] as Map<String, dynamic>?;
                      final nom = autreUser?['nom'] as String? ?? 'Inconnu';
                      final telephone = autreUser?['telephone'] as String? ?? '';
                      final derniersMsg = c['messages'] as List<dynamic>? ?? [];
                      final dernierContenu = derniersMsg.isNotEmpty
                          ? (derniersMsg[0] as Map<String, dynamic>)['contenu'] as String?
                          : null;
                      final dernierEnvoyeur = derniersMsg.isNotEmpty
                          ? (derniersMsg[0] as Map<String, dynamic>)['envoyeur'] as Map<String, dynamic>?
                          : null;
                      final estMoi = dernierEnvoyeur?['id'] == userId;
                      final nonLus = c['nonLus'] as int? ?? 0;
                      final date = c['misAJourLe'] as String? ?? '';

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Carte(
                          child: ListTile(
                            onTap: () => context.push('/conversations/${c['id']}'),
                            leading: CircleAvatar(
                              radius: 22,
                              backgroundColor: AppCouleurs.primaireClair,
                              child: Text(nom.isNotEmpty ? nom[0].toUpperCase() : '?',
                                  style: const TextStyle(fontWeight: FontWeight.w700,
                                      color: AppCouleurs.primaire)),
                            ),
                            title: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(child: Text(nom,
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                    overflow: TextOverflow.ellipsis)),
                                if (date.length >= 10)
                                  Text(date.substring(0, 10),
                                      style: const TextStyle(fontSize: 11,
                                          color: AppCouleurs.texteSecondaire)),
                              ],
                            ),
                            subtitle: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    dernierContenu != null
                                        ? '${estMoi ? "Vous : " : ""}$dernierContenu'
                                        : telephone,
                                    maxLines: 1, overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 13,
                                        color: AppCouleurs.texteSecondaire),
                                  ),
                                ),
                                if (nonLus > 0)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppCouleurs.primaire,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text('$nonLus',
                                        style: const TextStyle(fontSize: 11,
                                            color: AppCouleurs.blanc,
                                            fontWeight: FontWeight.w700)),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
