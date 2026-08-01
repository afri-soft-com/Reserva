import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../../theme.dart';
import '../../services/api_auth.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class ParrainageScreen extends StatefulWidget {
  const ParrainageScreen({super.key});

  @override
  State<ParrainageScreen> createState() => _ParrainageScreenState();
}

class _ParrainageScreenState extends State<ParrainageScreen> {
  bool _chargement = true;
  String? _code;
  int _points = 0;
  List<dynamic> _filleuls = [];

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final results = await Future.wait([
        ApiAuth.monCodeParrainage(),
        ApiAuth.mesParrainages(),
      ]);
      if (mounted) {
        setState(() {
          final code = results[0] as Map<String, dynamic>;
          _code = code['codeParrainage'] as String?;
          _points = (code['pointsGagnesParrainage'] as num?)?.toInt() ?? 0;
          _filleuls = results[1] as List<dynamic>;
        });
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _partager() async {
    final code = _code;
    if (code == null) return;
    try {
      await Share.share(
        'Rejoins-moi sur RESERVA avec mon code parrainage : $code\nGagnez 200 points de fidélité à l\'inscription !',
      );
    } catch (_) {
      if (mounted) ToastWidget.show(context, 'Impossible de partager', type: 'erreur');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Parrainage')),
      body: RefreshIndicator(
        onRefresh: _charger,
        color: AppCouleurs.primaire,
        child: _chargement
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Carte(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          const Icon(Icons.group_add, size: 48, color: AppCouleurs.primaire),
                          const SizedBox(height: 12),
                          const Text('Votre code de parrainage',
                            style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
                          const SizedBox(height: 6),
                          Text(_code ?? '—',
                            style: const TextStyle(
                              fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: 2,
                              color: AppCouleurs.primaireFonce,
                            )),
                          const SizedBox(height: 4),
                          const Text('Invitez vos amis : vous gagnez 200 points (10 000 FC) à chaque inscription.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: _partager,
                              icon: const Icon(Icons.share),
                              label: const Text('Partager mon code'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppCouleurs.primaire,
                                foregroundColor: AppCouleurs.blanc,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Carte(
                    child: ListTile(
                      leading: const Icon(Icons.stars, color: AppCouleurs.accent),
                      title: const Text('Points gagnés', style: TextStyle(fontWeight: FontWeight.w600)),
                      trailing: Text('$_points pts',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppCouleurs.accent)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('Mes filleuls (${_filleuls.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  if (_filleuls.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 32),
                      child: EcranVide(
                        icone: Icons.person_add_alt,
                        message: 'Aucun filleul pour le moment',
                        sousTitre: 'Partagez votre code pour commencer à gagner des points.',
                      ),
                    )
                  else
                    ..._filleuls.map((f) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Carte(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppCouleurs.primaireClair,
                            child: Text(
                              (f['nom'] as String? ?? '?')[0].toUpperCase(),
                              style: const TextStyle(fontWeight: FontWeight.w700, color: AppCouleurs.primaire),
                            ),
                          ),
                          title: Text(f['nom'] as String? ?? '',
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          subtitle: Text('${f['telephone']}',
                            style: const TextStyle(fontSize: 12)),
                          trailing: Text((f['creeLe'] as String? ?? '').substring(0, 10),
                            style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                        ),
                      ),
                    )),
                ],
              ),
      ),
    );
  }
}
