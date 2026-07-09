import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_admin.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';

class UtilisateursListScreen extends StatefulWidget {
  const UtilisateursListScreen({super.key});

  @override
  State<UtilisateursListScreen> createState() => _UtilisateursListScreenState();
}

class _UtilisateursListScreenState extends State<UtilisateursListScreen> {
  List<dynamic> _utilisateurs = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      _utilisateurs = await ApiAdmin.listerUtilisateurs(parPage: 50);
    } catch (_) {
      _utilisateurs = [];
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  IconData _roleIcone(String? role) {
    switch (role) {
      case 'ADMIN': return Icons.admin_panel_settings;
      case 'PRESTATAIRE': return Icons.business;
      default: return Icons.person;
    }
  }

  Color _roleCouleur(String? role) {
    switch (role) {
      case 'ADMIN': return AppCouleurs.alerte;
      case 'PRESTATAIRE': return AppCouleurs.primaire;
      default: return AppCouleurs.succes;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Padding(padding: EdgeInsets.all(16), child: Squelette());
    return RefreshIndicator(
      onRefresh: _charger,
      color: AppCouleurs.primaire,
      child: _utilisateurs.isEmpty
        ? SingleChildScrollView(child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              children: [
                Icon(Icons.people, size: 48, color: AppCouleurs.texteSecondaire),
                const SizedBox(height: 12),
                const Text('Aucun utilisateur', style: TextStyle(color: AppCouleurs.texteSecondaire)),
              ],
            ),
          ))
        : ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: _utilisateurs.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, i) {
              final u = _utilisateurs[i];
              final nom = u['nom'] as String? ?? '';
              final telephone = u['telephone'] as String? ?? '';
              final email = u['email'] as String?;
              final role = u['role'] as String? ?? 'CLIENT';
              final verifie = u['telephoneVerifie'] as bool? ?? false;
              return Carte(
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: _roleCouleur(role).withValues(alpha: 0.15),
                      child: Icon(_roleIcone(role), color: _roleCouleur(role), size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(nom, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: _roleCouleur(role).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(role, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _roleCouleur(role))),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text('$telephone${email != null ? " • $email" : ""}',
                            style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                          Row(
                            children: [
                              Icon(Icons.verified, size: 12, color: verifie ? AppCouleurs.succes : AppCouleurs.texteSecondaire),
                              const SizedBox(width: 4),
                              Text(verifie ? 'Vérifié' : 'Non vérifié',
                                style: TextStyle(fontSize: 11, color: verifie ? AppCouleurs.succes : AppCouleurs.texteSecondaire)),
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
    );
  }
}
