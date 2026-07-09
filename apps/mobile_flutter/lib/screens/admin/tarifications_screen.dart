import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_admin.dart';
import '../../widgets/carte.dart';
import '../../widgets/toast.dart';

const _typeLabels = {'TEXTE': 'Texte', 'NOMBRE': 'Nombre', 'POURCENT': 'Pourcentage', 'MONTANT': 'Montant'};

class TarificationsScreen extends StatefulWidget {
  const TarificationsScreen({super.key});

  @override
  State<TarificationsScreen> createState() => _TarificationsScreenState();
}

class _TarificationsScreenState extends State<TarificationsScreen> {
  List<dynamic> _configs = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final items = await ApiAdmin.listerConfigurations();
      if (mounted) setState(() => _configs = items);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Center(child: CircularProgressIndicator());

    return _configs.isEmpty
        ? const Center(child: Text('Aucune configuration.', style: TextStyle(color: AppCouleurs.texteSecondaire)))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _configs.length,
            itemBuilder: (ctx, i) {
              final c = _configs[i] as Map<String, dynamic>;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Carte(
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(c['cle'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, fontFamily: 'monospace', color: AppCouleurs.texte)),
                            const SizedBox(height: 2),
                            Text(c['valeur'] as String, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppCouleurs.primaire)),
                            if (c['description'] != null && (c['description'] as String).isNotEmpty)
                              Text(c['description'] as String, style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: c['actif'] == true ? AppCouleurs.succes.withValues(alpha: 0.15) : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _typeLabels[c['type'] as String] ?? (c['type'] as String? ?? ''),
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: c['actif'] == true ? AppCouleurs.succes : AppCouleurs.texteSecondaire),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
  }
}
