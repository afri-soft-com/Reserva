import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../config.dart';
import '../../theme.dart';

class ConfidentialiteScreen extends StatefulWidget {
  const ConfidentialiteScreen({super.key});

  @override
  State<ConfidentialiteScreen> createState() => _ConfidentialiteScreenState();
}

class _ConfidentialiteScreenState extends State<ConfidentialiteScreen> {
  String? _titre;
  String? _version;
  String? _corps;
  String _format = 'markdown';
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    try {
      final uri = Uri.parse('${AppConfig.apiUrl}/legal/privacy');
      final res = await http.get(uri).timeout(const Duration(seconds: 8));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final json = jsonDecode(res.body);
        final data = json is Map && json['donnees'] is Map
            ? json['donnees'] as Map<String, dynamic>
            : null;
        if (data != null && (data['body']?.toString().trim().isNotEmpty ?? false)) {
          if (!mounted) return;
          setState(() {
            _titre = data['title']?.toString();
            _version = data['version']?.toString();
            _corps = data['body']?.toString();
            _format = data['format']?.toString() ?? 'markdown';
            _chargement = false;
          });
          return;
        }
      }
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _titre = 'Politique de confidentialité — RESERVA RDC';
      _version = '1.0';
      _corps = _fallback;
      _format = 'markdown';
      _chargement = false;
    });
  }

  static const _fallback = '''
Nous collectons le nom, le numéro de téléphone, l'e-mail facultatif, l'historique de réservation et les références de paiement Mobile Money.

Ces données servent à créer le compte, confirmer les réservations, envoyer les rappels SMS, traiter les paiements et prévenir la fraude.

Vous pouvez consulter, corriger ou demander la suppression de vos données depuis votre profil.
''';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Confidentialité')),
      body: _chargement
          ? const Center(child: CircularProgressIndicator(color: AppCouleurs.primaire))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  _titre ?? 'Politique de confidentialité',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppCouleurs.primaireFonce,
                  ),
                ),
                if (_version != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Version $_version',
                    style: TextStyle(color: AppCouleurs.texteSecondaire, fontSize: 13),
                  ),
                ],
                const SizedBox(height: 20),
                Text(
                  _corps ?? '',
                  style: TextStyle(fontSize: 14, height: 1.45, color: AppCouleurs.texteSecondaire),
                ),
                if (_format == 'html')
                  const SizedBox.shrink(),
              ],
            ),
    );
  }
}
