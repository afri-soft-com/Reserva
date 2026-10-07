import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../theme.dart';
import '../../i18n.dart';
import '../../providers/auth_provider.dart';
import '../../providers/langue_provider.dart';
import '../../models/models.dart';
import '../../services/api_reservations.dart';
import '../../services/api_services.dart';
import '../../widgets/carte.dart';
import '../../widgets/badge_statut.dart';
import '../../widgets/toast.dart';
import '../../widgets/banniere_publicite.dart';
import '../../widgets/carte_prestataires.dart';

class AccueilScreen extends StatefulWidget {
  const AccueilScreen({super.key});

  @override
  State<AccueilScreen> createState() => _AccueilScreenState();
}

class _AccueilScreenState extends State<AccueilScreen> {
  ReservationDetaillee? _prochaineResa;
  List<ServiceAvecPrestataire> _servicesRecents = [];
  List<ServiceAvecPrestataire> _recommandations = [];
  int _nbEnAttente = 0;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    try {
      final results = await Future.wait([
        ApiReservations.listerMesReservations(),
        ApiServices.rechercherServices(parPage: 6),
        ApiServices.obtenirRecommandations(limite: 6),
      ]);
      final reservations = results[0] as List<ReservationDetaillee>;
      final services = results[1] as List<ServiceAvecPrestataire>;
      final recommandations = results[2] as List<ServiceAvecPrestataire>;
      final prochaines = reservations.where((r) =>
        r.reservation.statut == 'CONFIRMEE' || r.reservation.statut == 'EN_ATTENTE'
      ).toList();
      prochaines.sort((a, b) => a.creneau.debut.compareTo(b.creneau.debut));
      if (mounted) {
        setState(() {
          _prochaineResa = prochaines.isNotEmpty ? prochaines.first : null;
          _servicesRecents = services;
          _recommandations = recommandations;
          _nbEnAttente = reservations.where((r) => r.reservation.statut == 'EN_ATTENTE').length;
        });
      }
    } catch (_) {
      if (mounted) ToastWidget.show(context, 'Erreur de chargement', type: 'erreur');
    }
  }

  String _formater(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  /// Bandeau confiance type OTA (hold, PIN, QR).
  Widget _bandeauConfiance() {
    Widget item(IconData icon, String titre, String sous) {
      return Expanded(
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppCouleurs.blanc,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppCouleurs.bordure),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: AppCouleurs.primaire, size: 22),
              const SizedBox(height: 8),
              Text(titre, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
              const SizedBox(height: 2),
              Text(sous, style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire, height: 1.25)),
            ],
          ),
        ),
      );
    }

    return Row(
      children: [
        item(Icons.timer_outlined, 'Hold 15 min', 'Comme Booking : réservez sans stress'),
        const SizedBox(width: 8),
        item(Icons.pin, 'PIN sécurisé', 'SMS une seule fois à l\'inscription'),
        const SizedBox(width: 8),
        item(Icons.qr_code_2, 'QR billet', 'Check-in rapide chez le prestataire'),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    context.watch<LangueProvider>();
    final user = context.watch<AuthProvider>().utilisateur;

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: const Text('RESERVA', style: TextStyle(fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _charger,
        color: AppCouleurs.primaire,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildBanniere(user),
              const BannierePublicite(),
              const SizedBox(height: 20),
              if (_prochaineResa != null) ...[
                _buildProchaineReservation(),
                const SizedBox(height: 20),
              ],
                _buildStatsRow(),
              const SizedBox(height: 20),
              if (_recommandations.isNotEmpty) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Recommandé pour vous', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    TextButton(
                      onPressed: () => context.go('/services'),
                      child: Text(AppTraductions.t('voirTout'), style: const TextStyle(fontSize: 13)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _buildServicesRow(services: _recommandations),
                const SizedBox(height: 24),
              ],
              _bandeauConfiance(),
              const SizedBox(height: 20),
              Text(AppTraductions.t('categories'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              _categoriesGrid(context),
              if (_servicesRecents.isNotEmpty) ...[
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(AppTraductions.t('servicesPopulaires'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    TextButton(
                      onPressed: () => context.go('/services'),
                      child: Text(AppTraductions.t('voirTout'), style: const TextStyle(fontSize: 13)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _buildServicesRow(services: _servicesRecents),
              ],
              const SizedBox(height: 24),
              Text(AppTraductions.t('prestatairesProches'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              SizedBox(height: 300, child: CartePrestataires()),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBanniere(Utilisateur? user) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [AppCouleurs.primaireFonce, AppCouleurs.primaire]),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${AppTraductions.t('bonjour')}${user != null ? ' ${user.nom.split(' ').first}' : ''} 👋',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
          const SizedBox(height: 4),
          Text(AppTraductions.t('slogan'),
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 8),
          Text(AppTraductions.t('sousTitreAccueil'),
            style: const TextStyle(fontSize: 14, color: AppCouleurs.primaireClair)),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => context.push('/voyages'),
              icon: const Icon(Icons.flight_takeoff),
              label: const Text('Voyages — hôtels & bus'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCouleurs.accent,
                foregroundColor: AppCouleurs.primaireFonce,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => context.go('/services'),
              icon: const Icon(Icons.search),
              label: Text(AppTraductions.t('trouverService')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProchaineReservation() {
    final r = _prochaineResa!;
    final dateStr = r.creneau.debut.substring(0, 10);
    final heureStr = '${r.creneau.debut.substring(11, 16)} - ${r.creneau.fin.substring(11, 16)}';
    return GestureDetector(
      onTap: () => context.go('/reservation/${r.reservation.id}'),
      child: Carte(
        child: Row(
          children: [
            Container(
              width: 48, height: 48,
              decoration: BoxDecoration(
                color: AppCouleurs.accent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.calendar_today, color: AppCouleurs.accent, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(AppTraductions.t('prochaineReservation'),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCouleurs.texteSecondaire)),
                      ),
                      const SizedBox(width: 8),
                      BadgeStatut(statut: r.reservation.statut),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(r.service.nom, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text('$dateStr • $heureStr',
                    style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        Expanded(child: _miniCarte(Icons.calendar_month, AppTraductions.t('reservations'), _prochaineResa != null ? AppTraductions.t('uneActive') : AppTraductions.t('aucune'), AppCouleurs.primaire)),
        const SizedBox(width: 8),
        Expanded(child: _miniCarte(Icons.hourglass_bottom, AppTraductions.t('enAttente'), _nbEnAttente.toString(), AppCouleurs.avertissement)),
        const SizedBox(width: 8),
        Expanded(child: _miniCarte(Icons.star, AppTraductions.t('services'), _servicesRecents.length.toString(), AppCouleurs.succes)),
      ],
    );
  }

  Widget _miniCarte(IconData icon, String label, String valeur, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppCouleurs.blanc,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 6),
          Text(valeur, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color)),
          Text(label, style: const TextStyle(fontSize: 10, color: AppCouleurs.texteSecondaire)),
        ],
      ),
    );
  }

  Widget _categoriesGrid(BuildContext context) {
    final categories = [
      (AppTraductions.t('sante'), Icons.local_hospital, 'SANTE'),
      (AppTraductions.t('transport'), Icons.directions_bus, 'TRANSPORT'),
      (AppTraductions.t('hotellerie'), Icons.hotel, 'HOTELLERIE'),
      (AppTraductions.t('restauration'), Icons.restaurant, 'RESTAURATION'),
      (AppTraductions.t('salleReunion'), Icons.meeting_room, 'SALLE_REUNION'),
      (AppTraductions.t('administratif'), Icons.business, 'ADMINISTRATIF'),
      (AppTraductions.t('education'), Icons.school, 'EDUCATION'),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.85,
      ),
      itemCount: categories.length,
      itemBuilder: (ctx, i) {
        return GestureDetector(
          onTap: () {
            if (categories[i].$3 == 'HOTELLERIE') {
              context.push('/hotels');
            } else if (categories[i].$3 == 'TRANSPORT') {
              context.push('/transport');
            } else {
              context.go('/services', extra: categories[i].$3);
            }
          },
          child: Container(
            decoration: BoxDecoration(
              color: AppCouleurs.blanc,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(color: AppCouleurs.primaireClair, shape: BoxShape.circle),
                  child: Icon(categories[i].$2, color: AppCouleurs.primaire, size: 18),
                ),
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Text(categories[i].$1, textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildServicesRow({required List<ServiceAvecPrestataire> services}) {
    return SizedBox(
      height: 180,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: services.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (ctx, i) {
          final s = services[i];
          return GestureDetector(
            onTap: () => context.go('/service/${s.id}'),
            child: Container(
              width: 160,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppCouleurs.blanc,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(color: AppCouleurs.primaireClair, borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.miscellaneous_services, color: AppCouleurs.primaire, size: 20),
                  ),
                  const SizedBox(height: 8),
                  Text(s.nom, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                    maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Text(s.nomEntreprise, style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                  const Spacer(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(_formater(s.prix, s.devise),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppCouleurs.primaire)),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.star, size: 12, color: AppCouleurs.accent),
                          const SizedBox(width: 2),
                          Text(s.noteMoyenne.toStringAsFixed(1),
                            style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
