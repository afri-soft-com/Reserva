import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../services/api_transport.dart';
import '../../widgets/toast.dart';

class TransportRechercheScreen extends StatefulWidget {
  const TransportRechercheScreen({super.key});

  @override
  State<TransportRechercheScreen> createState() => _TransportRechercheScreenState();
}

class _TransportRechercheScreenState extends State<TransportRechercheScreen> {
  String _origine = 'Kinshasa';
  String _destination = 'Matadi';
  late DateTime _date;
  int _places = 1;
  String _tri = 'depart';
  bool _chargement = false;
  List<String> _villes = ['Kinshasa', 'Matadi', 'Lubumbashi', 'Goma', 'Bukavu'];
  List<dynamic> _items = [];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _date = DateTime(now.year, now.month, now.day).add(const Duration(days: 1));
    _chargerVilles();
    _rechercher();
  }

  String _yyyymmdd(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _chargerVilles() async {
    try {
      final v = await ApiTransport.listerVilles();
      if (v.isNotEmpty && mounted) setState(() => _villes = v);
    } catch (_) {}
  }

  Future<void> _rechercher() async {
    setState(() => _chargement = true);
    try {
      final r = await ApiTransport.rechercher(
        origine: _origine,
        destination: _destination,
        date: _yyyymmdd(_date),
        places: _places,
        tri: _tri,
      );
      if (mounted) setState(() => _items = (r['items'] as List?) ?? []);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  void _inverser() {
    setState(() {
      final tmp = _origine;
      _origine = _destination;
      _destination = tmp;
    });
  }

  String _duree(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return m == 0 ? '${h}h' : '${h}h${m.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Bus & trajets')),
      body: Column(
        children: [
          Container(
            color: AppCouleurs.blanc,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _villes.contains(_origine) ? _origine : _villes.first,
                        decoration: const InputDecoration(labelText: 'Départ'),
                        items: _villes.map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
                        onChanged: (v) => setState(() => _origine = v ?? _origine),
                      ),
                    ),
                    IconButton(onPressed: _inverser, icon: const Icon(Icons.swap_vert)),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _villes.contains(_destination) ? _destination : _villes.last,
                        decoration: const InputDecoration(labelText: 'Arrivée'),
                        items: _villes.map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
                        onChanged: (v) => setState(() => _destination = v ?? _destination),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final p = await showDatePicker(
                            context: context,
                            initialDate: _date,
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now().add(const Duration(days: 20)),
                          );
                          if (p != null) setState(() => _date = p);
                        },
                        icon: const Icon(Icons.calendar_today, size: 16),
                        label: Text(_yyyymmdd(_date)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    DropdownButton<int>(
                      value: _places,
                      items: List.generate(6, (i) => DropdownMenuItem(value: i + 1, child: Text('${i + 1} pl.'))),
                      onChanged: (v) => setState(() => _places = v ?? 1),
                    ),
                    const SizedBox(width: 8),
                    DropdownButton<String>(
                      value: _tri,
                      items: const [
                        DropdownMenuItem(value: 'depart', child: Text('Heure')),
                        DropdownMenuItem(value: 'prix', child: Text('Prix')),
                        DropdownMenuItem(value: 'duree', child: Text('Durée')),
                      ],
                      onChanged: (v) => setState(() => _tri = v ?? 'depart'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _chargement ? null : _rechercher,
                    icon: const Icon(Icons.search),
                    label: const Text('Rechercher'),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _chargement
                ? const Center(child: CircularProgressIndicator())
                : _items.isEmpty
                    ? const Center(child: Text('Aucun départ disponible.'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(12),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final t = _items[i] as Map<String, dynamic>;
                          final op = t['operateur'] as Map<String, dynamic>? ?? {};
                          return InkWell(
                            onTap: () => context.push('/transport/${t['id']}', extra: {'places': _places}),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppCouleurs.blanc,
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text('${t['heureDepart']}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                                      const SizedBox(width: 8),
                                      Text(_duree((t['dureeMinutes'] as num).toInt()), style: const TextStyle(color: AppCouleurs.texteSecondaire)),
                                      const Spacer(),
                                      Text('${(t['prix'] as num).toStringAsFixed(0)} FC', style: const TextStyle(fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
                                    ],
                                  ),
                                  Text('${op['nom']} · ${t['confort']} · ${t['placesRestantes']} places',
                                    style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                                  if (t['remboursable'] == true)
                                    const Text('Annulation flexible', style: TextStyle(fontSize: 12, color: AppCouleurs.succes, fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
