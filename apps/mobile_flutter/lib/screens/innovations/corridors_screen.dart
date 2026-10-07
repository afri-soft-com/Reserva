import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/api_innovations.dart';
import '../../widgets/toast.dart';

class CorridorsScreen extends StatefulWidget {
  const CorridorsScreen({super.key});

  @override
  State<CorridorsScreen> createState() => _CorridorsScreenState();
}

class _CorridorsScreenState extends State<CorridorsScreen> {
  List<dynamic> _items = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final items = await ApiInnovations.packagesCorridors();
      if (mounted) setState(() => _items = items);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Corridors voyage + soins')),
      body: _chargement
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'Aucun pack corridor pour l’instant.\nEx. Mbuji-Mayi → Kinshasa (bus + hôtel + RDV).',
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length,
                  itemBuilder: (_, i) {
                    final p = _items[i] as Map<String, dynamic>;
                    final origine = p['corridorOrigine'] ?? '?';
                    final dest = p['corridorDestination'] ?? '?';
                    final conf = p['prestataire']?['scoreConfiance'];
                    return Card(
                      child: ListTile(
                        leading: const Icon(Icons.route),
                        title: Text(p['nom']?.toString() ?? 'Corridor'),
                        subtitle: Text('$origine → $dest · ${p['prix']} ${p['devise']}${conf != null ? ' · confiance $conf' : ''}'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => context.push('/package/${p['id']}'),
                      ),
                    );
                  },
                ),
    );
  }
}
