import 'package:flutter/material.dart';
import '../../services/son_alerte_reserva.dart';
import '../../theme.dart';

/// Réglages son d'alerte (Prestataire) — inspiré SafeAlert.
class SonAlerteScreen extends StatefulWidget {
  const SonAlerteScreen({super.key});

  @override
  State<SonAlerteScreen> createState() => _SonAlerteScreenState();
}

class _SonAlerteScreenState extends State<SonAlerteScreen> {
  bool _chargement = true;
  bool _actif = true;
  SonAlerteReserva _son = SonAlerteReserva.impulsion;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    await SonAlerteService.initialiser();
    if (!mounted) return;
    setState(() {
      _actif = SonAlerteService.actif;
      _son = SonAlerteService.sonCourant;
      _chargement = false;
    });
  }

  Future<void> _choisir(SonAlerteReserva son) async {
    setState(() => _son = son);
    await SonAlerteService.definirSon(son);
    await SonAlerteService.jouer(forcer: true);
  }

  Future<void> _basculerActif(bool v) async {
    setState(() => _actif = v);
    await SonAlerteService.definirActif(v);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: const Text('Son Reserva'),
        backgroundColor: AppCouleurs.blanc,
        foregroundColor: AppCouleurs.texte,
        elevation: 0,
      ),
      body: _chargement
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                Text(
                  'Son propre à Reserva, différent des autres apps. Joué à chaque nouvelle réservation reçue (push local + in-app).',
                  style: TextStyle(color: AppCouleurs.texteSecondaire, height: 1.4, fontSize: 14),
                ),
                const SizedBox(height: 16),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Alertes sonores', style: TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(
                    _actif ? 'Activées pour les nouvelles réservations' : 'Désactivées',
                    style: TextStyle(color: AppCouleurs.texteSecondaire, fontSize: 13),
                  ),
                  value: _actif,
                  activeColor: AppCouleurs.accent,
                  onChanged: _basculerActif,
                ),
                const SizedBox(height: 8),
                ...SonAlerteReserva.values.map((s) {
                  final selected = _son == s;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Material(
                      color: selected
                          ? AppCouleurs.accent.withValues(alpha: 0.12)
                          : AppCouleurs.blanc,
                      borderRadius: BorderRadius.circular(16),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => _choisir(s),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: selected ? AppCouleurs.accent : AppCouleurs.bordure,
                              width: selected ? 1.5 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                selected ? Icons.radio_button_checked : Icons.radio_button_off,
                                color: selected ? AppCouleurs.accent : AppCouleurs.texteSecondaire,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      s.titre,
                                      style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 16,
                                        color: AppCouleurs.texte,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      s.description,
                                      style: TextStyle(
                                        fontSize: 13,
                                        height: 1.3,
                                        color: AppCouleurs.texteSecondaire,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                tooltip: 'Écouter',
                                onPressed: () async {
                                  await SonAlerteService.definirSon(s);
                                  setState(() => _son = s);
                                  await SonAlerteService.jouer(forcer: true);
                                },
                                icon: Icon(Icons.volume_up_outlined, color: AppCouleurs.texteSecondaire),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppCouleurs.texte,
                    side: BorderSide(color: AppCouleurs.texte, width: 1.4),
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                  ),
                  onPressed: () => SonAlerteService.jouer(forcer: true),
                  icon: Icon(Icons.notifications_active, color: AppCouleurs.alerte),
                  label: const Text(
                    'Tester la notification sonore',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Si le test est silencieux : Réglages Android → Apps → RESERVA Pro → Notifications → activez « Nouvelles réservations » et le son. Sur iOS : Réglages → RESERVA Pro → Notifications → Sons.',
                  style: TextStyle(fontSize: 12, height: 1.4, color: AppCouleurs.texteSecondaire),
                ),
              ],
            ),
    );
  }
}
