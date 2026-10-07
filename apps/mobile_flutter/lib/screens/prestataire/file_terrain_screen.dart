import 'package:flutter/material.dart';
import '../../services/api_innovations.dart';
import '../../theme.dart';
import '../../widgets/toast.dart';

/// Mode Pro terrain : file du jour + appel du prochain client (SMS).
class FileTerrainScreen extends StatefulWidget {
  const FileTerrainScreen({super.key});

  @override
  State<FileTerrainScreen> createState() => _FileTerrainScreenState();
}

class _FileTerrainScreenState extends State<FileTerrainScreen> {
  Map<String, dynamic>? _data;
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final data = await ApiInnovations.fileTerrain();
      if (mounted) setState(() => _data = data);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _appeler() async {
    try {
      final r = await ApiInnovations.appelerProchain();
      if (mounted) {
        ToastWidget.show(context, r['message']?.toString() ?? 'Appelé', type: 'succes');
        _charger();
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  @override
  Widget build(BuildContext context) {
    final file = (_data?['file'] as List?) ?? [];
    return Scaffold(
      appBar: AppBar(
        title: const Text('File terrain'),
        actions: [IconButton(onPressed: _charger, icon: const Icon(Icons.refresh))],
      ),
      body: _chargement
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (_data?['enCours'] != null)
                  Container(
                    width: double.infinity,
                    color: AppCouleurs.primaire.withValues(alpha: 0.12),
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'En cours : ${_data!['enCours']['client']} — ${_data!['enCours']['service']}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _appeler,
                      icon: const Icon(Icons.campaign),
                      label: Text(
                        _data?['prochain'] != null
                            ? 'Appeler ${_data!['prochain']['client']}'
                            : 'Personne en attente',
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: file.length,
                    itemBuilder: (_, i) {
                      final r = file[i] as Map<String, dynamic>;
                      return ListTile(
                        leading: CircleAvatar(child: Text('${r['position']}')),
                        title: Text('${r['client']} · ${r['service']}'),
                        subtitle: Text('${r['numero']} · ${r['statut']} · offline ✓'),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
