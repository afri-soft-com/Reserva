import 'package:flutter/material.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../services/api_voix.dart';
import '../../theme.dart';
import '../../widgets/toast.dart';

/// Appel vocal 1:1 via LiveKit (conversation ou réservation).
class AppelVocalScreen extends StatefulWidget {
  final String? conversationId;
  final String? reservationId;
  final String? titre;

  const AppelVocalScreen({
    super.key,
    this.conversationId,
    this.reservationId,
    this.titre,
  }) : assert(conversationId != null || reservationId != null);

  @override
  State<AppelVocalScreen> createState() => _AppelVocalScreenState();
}

class _AppelVocalScreenState extends State<AppelVocalScreen> {
  Room? _room;
  bool _connexion = true;
  bool _muet = false;
  String? _erreur;
  String? _interlocuteur;

  @override
  void initState() {
    super.initState();
    _demarrer();
  }

  Future<void> _demarrer() async {
    try {
      final mic = await Permission.microphone.request();
      if (!mic.isGranted) {
        setState(() {
          _connexion = false;
          _erreur = 'Autorisez le microphone pour appeler.';
        });
        return;
      }

      final data = await ApiVoix.token(
        conversationId: widget.conversationId,
        reservationId: widget.reservationId,
      );
      final url = data['url'] as String?;
      final token = data['token'] as String?;
      if (url == null || url.isEmpty || token == null || token.isEmpty) {
        throw Exception('Configuration LiveKit incomplète côté serveur.');
      }

      final room = Room();
      await room.connect(url, token);
      await room.localParticipant?.setMicrophoneEnabled(true);

      if (!mounted) {
        await room.disconnect();
        return;
      }
      setState(() {
        _room = room;
        _connexion = false;
        _interlocuteur = data['interlocuteur'] as String?;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _connexion = false;
          _erreur = e.toString();
        });
      }
    }
  }

  Future<void> _basculerMuet() async {
    final room = _room;
    if (room == null) return;
    final next = !_muet;
    await room.localParticipant?.setMicrophoneEnabled(!next);
    setState(() => _muet = next);
  }

  Future<void> _raccrocher() async {
    await _room?.disconnect();
    _room = null;
    if (mounted) Navigator.of(context).pop();
  }

  @override
  void dispose() {
    _room?.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final titre = widget.titre ?? _interlocuteur ?? 'Appel vocal';
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: Text(titre),
        elevation: 0,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircleAvatar(
                radius: 48,
                backgroundColor: AppCouleurs.primaire.withValues(alpha: 0.3),
                child: const Icon(Icons.person, size: 48, color: Colors.white),
              ),
              const SizedBox(height: 16),
              Text(
                _connexion
                    ? 'Connexion…'
                    : (_erreur != null ? 'Échec de l\'appel' : 'En communication'),
                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600),
              ),
              if (_erreur != null) ...[
                const SizedBox(height: 12),
                Text(_erreur!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.redAccent)),
              ],
              const SizedBox(height: 48),
              if (_connexion)
                const CircularProgressIndicator(color: Colors.white)
              else
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (_erreur == null) ...[
                      _Action(
                        icon: _muet ? Icons.mic_off : Icons.mic,
                        label: _muet ? 'Activer' : 'Muet',
                        color: _muet ? Colors.orange : Colors.white24,
                        onTap: _basculerMuet,
                      ),
                      const SizedBox(width: 32),
                    ],
                    _Action(
                      icon: Icons.call_end,
                      label: _erreur != null ? 'Fermer' : 'Raccrocher',
                      color: Colors.red,
                      onTap: () {
                        if (_erreur != null) {
                          Navigator.pop(context);
                        } else {
                          _raccrocher();
                        }
                      },
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Action extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _Action({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(40),
          child: CircleAvatar(
            radius: 32,
            backgroundColor: color,
            child: Icon(icon, color: Colors.white, size: 28),
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ],
    );
  }
}

/// Lance l'écran d'appel (gestion d'erreur toast).
Future<void> lancerAppelVocal(
  BuildContext context, {
  String? conversationId,
  String? reservationId,
  String? titre,
}) async {
  try {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AppelVocalScreen(
          conversationId: conversationId,
          reservationId: reservationId,
          titre: titre,
        ),
      ),
    );
  } catch (e) {
    if (context.mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
  }
}
