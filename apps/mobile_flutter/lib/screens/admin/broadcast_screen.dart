import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_admin.dart';
import '../../widgets/carte.dart';
import '../../widgets/toast.dart';

class BroadcastScreen extends StatefulWidget {
  const BroadcastScreen({super.key});

  @override
  State<BroadcastScreen> createState() => _BroadcastScreenState();
}

class _BroadcastScreenState extends State<BroadcastScreen> {
  final _titreCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();
  String _role = '';
  bool _envoi = false;

  @override
  void dispose() {
    _titreCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _envoyer() async {
    final titre = _titreCtrl.text.trim();
    final message = _messageCtrl.text.trim();
    if (titre.isEmpty || message.isEmpty) {
      ToastWidget.show(context, 'Titre et message sont requis.', type: 'erreur');
      return;
    }
    setState(() => _envoi = true);
    try {
      final resultat = await ApiAdmin.envoyerBroadcast(titre: titre, message: message, role: _role);
      if (mounted) {
        ToastWidget.show(context,
          'Notification envoyée à ${resultat['envoyees'] ?? 0} utilisateur(s).', type: 'succes');
        _titreCtrl.clear();
        _messageCtrl.clear();
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Diffuser une annonce',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        const Text('Envoie une notification SYSTEME à tous les utilisateurs ou à un rôle ciblé.',
          style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
        const SizedBox(height: 16),
        Carte(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _titreCtrl,
                maxLength: 100,
                decoration: const InputDecoration(
                  labelText: 'Titre',
                  hintText: 'Ex: Maintenance programmée',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _messageCtrl,
                maxLines: 4,
                maxLength: 1000,
                decoration: const InputDecoration(
                  labelText: 'Message',
                  hintText: 'Ex: L\'application sera indisponible dimanche de 02h à 04h.',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              const Text('Destinataires', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  _choixRole('', 'Tous'),
                  _choixRole('CLIENT', 'Clients'),
                  _choixRole('PRESTATAIRE', 'Prestataires'),
                  _choixRole('ADMIN', 'Admins'),
                ],
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  onPressed: _envoi ? null : _envoyer,
                  icon: const Icon(Icons.campaign),
                  label: const Text('Envoyer la notification'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppCouleurs.primaire,
                    foregroundColor: AppCouleurs.blanc,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _choixRole(String role, String libelle) {
    final selectionne = _role == role;
    return ChoiceChip(
      label: Text(libelle),
      selected: selectionne,
      onSelected: (_) => setState(() => _role = role),
      selectedColor: AppCouleurs.primaireClair,
      labelStyle: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: selectionne ? AppCouleurs.primaire : AppCouleurs.texteSecondaire,
      ),
    );
  }
}
