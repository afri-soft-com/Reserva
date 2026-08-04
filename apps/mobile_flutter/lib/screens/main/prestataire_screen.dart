import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../../theme.dart';
import '../../models/models.dart';
import '../../services/api_prestataire.dart';
import '../../services/cache_hors_ligne.dart';
import '../../widgets/carte.dart';
import '../../widgets/badge_statut.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';
import '../prestataire/scan_qr_screen.dart';
import '../prestataire/packages_screen.dart';
import '../prestataire/calendrier_prestataire_screen.dart';
import '../prestataire/statistiques_prestataire_screen.dart';
import '../prestataire/indisponibilites_prestataire_screen.dart';

class PrestataireScreen extends StatefulWidget {
  const PrestataireScreen({super.key});

  @override
  State<PrestataireScreen> createState() => _PrestataireScreenState();
}

class _PrestataireScreenState extends State<PrestataireScreen> with AutomaticKeepAliveClientMixin {
  DashboardData? _dashboard;
  List<dynamic> _services = [];
  AvisRecusData? _avisData;
  String? _profilStatut;
  Map<String, dynamic>? _abonnement;
  bool _chargement = true;
  int _ongletCourant = 0;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final results = await Future.wait([
        ApiPrestataire.obtenirTableauDeBord(),
        ApiPrestataire.listerMesServices(),
        ApiPrestataire.obtenirAvisRecus(),
        ApiPrestataire.obtenirProfil(),
        ApiPrestataire.obtenirAbonnement(),
      ]);
      if (mounted) {
        setState(() {
          _dashboard = results[0] as DashboardData;
          _services = results[1] as List<dynamic>;
          _avisData = results[2] as AvisRecusData;
          final profil = results[3] as Map<String, dynamic>;
          _profilStatut = profil['statut'] as String?;
          _abonnement = results[4] as Map<String, dynamic>?;
        });
      }
    } catch (_) {
      if (mounted) { ToastWidget.show(context, 'Erreur chargement tableau de bord', type: 'erreur'); }
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _formater(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  String _formaterDuree(int minutes) {
    if (minutes >= 1440 && minutes % 1440 == 0) return '${minutes ~/ 1440} j';
    if (minutes >= 60 && minutes % 60 == 0) return '${minutes ~/ 60} h';
    return '$minutes min';
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_chargement) {
      return Scaffold(
        backgroundColor: AppCouleurs.fond,
        appBar: AppBar(title: const Text('Mon espace')),
        body: const Padding(padding: EdgeInsets.all(16), child: Squelette()),
      );
    }

    if (_profilStatut == 'EN_ATTENTE_VALIDATION') {
      return Scaffold(
        backgroundColor: AppCouleurs.fond,
        appBar: AppBar(title: const Text('Mon espace')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.hourglass_empty, size: 64, color: AppCouleurs.avertissement),
                const SizedBox(height: 16),
                const Text('Profil en attente de validation',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                const Text('Votre demande de profil prestataire est en cours de vérification par l\'équipe RESERVA.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppCouleurs.texteSecondaire)),
              ],
            ),
          ),
        ),
      );
    }

    if (_profilStatut == 'REJETE') {
      return Scaffold(
        backgroundColor: AppCouleurs.fond,
        appBar: AppBar(title: const Text('Mon espace')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.cancel, size: 64, color: AppCouleurs.alerte),
                const SizedBox(height: 16),
                const Text('Profil non approuvé',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                const Text('Contactez l\'équipe RESERVA pour plus d\'informations.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppCouleurs.texteSecondaire)),
              ],
            ),
          ),
        ),
      );
    }

    final stats = _dashboard?.statistiques;
    final todayReservations = _dashboard?.reservationsAujourdhui ?? [];

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: const Text('Mon espace'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month),
            tooltip: 'Calendrier',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CalendrierPrestataireScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.bar_chart),
            tooltip: 'Statistiques',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const StatistiquesPrestataireScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.event_busy),
            tooltip: 'Jours bloqués',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const IndisponibilitesPrestataireScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scanner un QR client',
            onPressed: _ouvrirScanner,
          ),
          IconButton(
            icon: const Icon(Icons.ios_share),
            tooltip: 'Partager le rapport (CSV)',
            onPressed: _partagerRapport,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _charger,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _charger,
        color: AppCouleurs.primaire,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (ApiPrestataire.horsLigne) ...[
              _buildBandeauHorsLigne(),
              const SizedBox(height: 8),
            ],
            _buildStatsRow(stats),
            const SizedBox(height: 8),
            _buildStatsRow2(stats),
            if (_abonnement != null) ...[
              const SizedBox(height: 8),
              _buildAbonnementCard(),
            ],
            const SizedBox(height: 16),
            _buildOnglets(),
            const SizedBox(height: 12),
            if (_ongletCourant == 0) _buildTodaySchedule(todayReservations),
            if (_ongletCourant == 0 && todayReservations.isEmpty) ...[
              const Padding(
                padding: EdgeInsets.only(top: 32),
                child: EcranVide(icone: Icons.event_busy, message: 'Aucune réservation aujourd\'hui',
                  sousTitre: 'Les réservations du jour apparaîtront ici.'),
              ),
            ],
            if (_ongletCourant == 0) ...[
              const SizedBox(height: 20),
              _buildProchainesReservations(),
            ],
            if (_ongletCourant == 1) _buildReservationsTab(),
            if (_ongletCourant == 2) _buildServicesTab(),
            if (_ongletCourant == 3) _buildAvisTab(),
            if (_ongletCourant == 4) const PackagesScreen(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow(DashboardStats? stats) {
    if (stats == null) return const SizedBox.shrink();
    return Row(
      children: [
        Expanded(child: _statCard(Icons.today, 'Aujourd\'hui', '${_dashboard?.reservationsAujourdhui.length ?? 0}', AppCouleurs.primaire)),
        const SizedBox(width: 8),
        Expanded(child: _statCard(Icons.calendar_month, 'Mois', '${stats.totalReservationsMois}', AppCouleurs.succes)),
        const SizedBox(width: 8),
        Expanded(child: _statCard(Icons.monetization_on, 'Revenus', _formater(stats.revenusMoisEnCours, 'CDF'), AppCouleurs.accent)),
      ],
    );
  }

  Widget _buildAbonnementCard() {
    final abo = _abonnement?['abonnement'] as Map<String, dynamic>?;
    if (abo == null) return const SizedBox.shrink();
    final plan = abo['plan'] as Map<String, dynamic>? ?? {};
    final nomPlan = plan['nom'] as String? ?? 'Gratuit';
    final fin = abo['dateFin'] as String? ?? '';
    final featuresRaw = plan['fonctionnalites'];
    List<String> fonctionnalites = [];
    if (featuresRaw is List) {
      fonctionnalites = featuresRaw.map((e) => e.toString()).toList();
    } else if (featuresRaw is String) {
      try {
        final parsed = jsonDecode(featuresRaw) as List;
        fonctionnalites = parsed.map((e) => e.toString()).toList();
      } catch (_) {}
    }

    return Carte(
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: nomPlan == 'Premium' ? AppCouleurs.accent.withValues(alpha: 0.15) : AppCouleurs.primaireClair,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              nomPlan == 'Premium' ? Icons.workspace_premium : Icons.card_membership,
              color: nomPlan == 'Premium' ? AppCouleurs.accent : AppCouleurs.primaire, size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(nomPlan, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppCouleurs.succes.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('ACTIF', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppCouleurs.succes)),
                    ),
                  ],
                ),
                if (fin.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text('Expire le ${fin.substring(0, 10)}', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                ],
                if (fonctionnalites.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    runSpacing: 2,
                    children: fonctionnalites.map((f) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppCouleurs.primaireClair,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(f, style: const TextStyle(fontSize: 9, color: AppCouleurs.primaire)),
                    )).toList(),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statCard(IconData icon, String label, String value, Color color) {
    return Carte(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
          Text(label, style: const TextStyle(fontSize: 10, color: AppCouleurs.texteSecondaire)),
        ],
      ),
    );
  }

  Widget _buildStatsRow2(DashboardStats? stats) {
    if (stats == null) return const SizedBox.shrink();
    return Row(
      children: [
        Expanded(child: _statCard(Icons.percent, 'Occupation', '${stats.tauxOccupation.toStringAsFixed(1)}%', AppCouleurs.avertissement)),
        const SizedBox(width: 8),
        Expanded(child: _statCard(Icons.trending_up, 'Annuel', _formater(stats.revenusAnnuels, 'CDF'), AppCouleurs.primaire)),
        const SizedBox(width: 8),
        Expanded(child: _statCard(Icons.star, 'Meilleur mois', '${stats.meilleurMois}', AppCouleurs.accent)),
      ],
    );
  }

  Widget _buildOnglets() {
    final actions = _dashboard?.statistiques.reservationsEnAttenteAction ?? 0;
    return Row(
      children: [
        _onglet('Jour', 0, badge: _dashboard?.reservationsAujourdhui.length ?? 0),
        const SizedBox(width: 8),
        _onglet('Réservations', 1, badge: actions),
        const SizedBox(width: 8),
        _onglet('Services', 2, badge: _services.length),
        const SizedBox(width: 8),
        _onglet('Avis', 3, badge: _avisData?.nombreAvis ?? 0),
        const SizedBox(width: 8),
        _onglet('Packages', 4),
      ],
    );
  }

  Widget _onglet(String label, int index, {int badge = 0}) {
    final actif = _ongletCourant == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _ongletCourant = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: actif ? AppCouleurs.primaire : AppCouleurs.blanc,
            borderRadius: BorderRadius.circular(AppRayons.bouton),
            border: Border.all(color: actif ? AppCouleurs.primaire : AppCouleurs.bordure),
          ),
          child: Column(
            children: [
              Text(label, style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.w600,
                color: actif ? AppCouleurs.blanc : AppCouleurs.texteSecondaire)),
              if (badge > 0)
                Text('$badge', style: TextStyle(
                  fontSize: 10, color: actif ? AppCouleurs.blanc.withValues(alpha: 0.8) : AppCouleurs.texteSecondaire)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTodaySchedule(List<ReservationDetaillee> reservations) {
    if (reservations.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Aujourd\'hui — ${reservations.length} réservation(s)',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...reservations.map((r) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Carte(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(r.reservation.numero,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    ),
                    const SizedBox(width: 8),
                    BadgeStatut(statut: r.reservation.statut),
                  ],
                ),
                const SizedBox(height: 6),
                Text(r.service.nom, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.person, size: 14, color: AppCouleurs.texteSecondaire),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(r.prestataire.nomEntreprise,
                        style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                    ),
                    const SizedBox(width: 8),
                    Icon(Icons.access_time, size: 14, color: AppCouleurs.texteSecondaire),
                    const SizedBox(width: 4),
                    Text('${r.creneau.debut.substring(11, 16)} - ${r.creneau.fin.substring(11, 16)}',
                      style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                  ],
                ),
                if (r.reservation.statut == StatutReservation.enAttente) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 36,
                          child: ElevatedButton.icon(
                            onPressed: () => _repondreReservation(r.reservation.id, true),
                            icon: const Icon(Icons.check, size: 16),
                            label: const Text('Accepter', style: TextStyle(fontSize: 12)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppCouleurs.succes, foregroundColor: AppCouleurs.blanc,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: SizedBox(
                          height: 36,
                          child: ElevatedButton.icon(
                            onPressed: () => _repondreReservation(r.reservation.id, false),
                            icon: const Icon(Icons.close, size: 16),
                            label: const Text('Refuser', style: TextStyle(fontSize: 12)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppCouleurs.alerte, foregroundColor: AppCouleurs.blanc,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                if (r.reservation.statut == StatutReservation.confirmee) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 36,
                          child: ElevatedButton.icon(
                            onPressed: () => _entamerReservation(r.reservation.id),
                            icon: const Icon(Icons.play_arrow, size: 16),
                            label: const Text('Démarrer', style: TextStyle(fontSize: 12)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppCouleurs.primaire, foregroundColor: AppCouleurs.blanc,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: SizedBox(
                          height: 36,
                          child: OutlinedButton.icon(
                            onPressed: () => _ouvrirScanner(),
                            icon: const Icon(Icons.qr_code_scanner, size: 16),
                            label: const Text('Scanner', style: TextStyle(fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppCouleurs.primaire,
                              side: const BorderSide(color: AppCouleurs.primaire),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                if (r.reservation.statut == StatutReservation.enCours) ...[
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity, height: 36,
                    child: ElevatedButton.icon(
                      onPressed: () => _cloturerReservation(r.reservation.id),
                      icon: const Icon(Icons.task_alt, size: 16),
                      label: const Text('Clôturer la prestation', style: TextStyle(fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppCouleurs.succes, foregroundColor: AppCouleurs.blanc,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        )),
      ],
    );
  }

  Widget _buildProchainesReservations() {
    final prochaines = _dashboard?.prochainesReservations ?? [];
    if (prochaines.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('À venir (7 jours) — ${prochaines.length}',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...prochaines.map((r) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Carte(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(r.reservation.numero,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    ),
                    const SizedBox(width: 8),
                    BadgeStatut(statut: r.reservation.statut),
                  ],
                ),
                const SizedBox(height: 6),
                Text(r.service.nom, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.person, size: 14, color: AppCouleurs.texteSecondaire),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(r.prestataire.nomEntreprise,
                        style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                    ),
                    const SizedBox(width: 8),
                    Icon(Icons.access_time, size: 14, color: AppCouleurs.texteSecondaire),
                    const SizedBox(width: 4),
                    Text('${_formaterJour(r.creneau.debut)} ${r.creneau.debut.substring(11, 16)} - ${r.creneau.fin.substring(11, 16)}',
                      style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                  ],
                ),
              ],
            ),
          ),
        )),
      ],
    );
  }

  String _formaterJour(String dateIso) {
    try {
      final d = DateTime.parse(dateIso);
      final mois = const ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
      return '${d.day} ${mois[d.month - 1]}';
    } catch (_) {
      return dateIso.substring(0, 10);
    }
  }

  Widget _buildReservationsTab() {
    final stats = _dashboard?.statistiques;
    final servicesPopulaires = _dashboard?.servicesPopulaires ?? [];
    final parStatut = _dashboard?.parStatut ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('En attente: ${_dashboard?.statistiques.reservationsEnAttenteAction ?? 0}',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            TextButton.icon(
              onPressed: () => setState(() => _ongletCourant = 1),
              icon: const Icon(Icons.open_in_new, size: 16),
              label: const Text('Voir tout', style: TextStyle(fontSize: 13)),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            Expanded(child: _statCard(Icons.star, 'Note', (stats?.noteMoyenne.toStringAsFixed(1) ?? "-"), AppCouleurs.accent)),
            const SizedBox(width: 8),
            Expanded(child: _statCard(Icons.people, 'Avis', '${stats?.nombreAvis ?? 0}', AppCouleurs.primaire)),
            const SizedBox(width: 8),
            Expanded(child: _statCard(Icons.trending_up, 'Semaine', '${stats?.totalReservationsSemaine ?? 0}', AppCouleurs.succes)),
          ],
        ),
        if (_dashboard?.statistiques.evolutionMensuelle.isNotEmpty ?? false) ...[
          const SizedBox(height: 16),
          _buildEvolutionSection(),
        ],
        if (servicesPopulaires.isNotEmpty) ...[
          const SizedBox(height: 16),
          _buildServicesPopulairesSection(servicesPopulaires),
        ],
        if (parStatut.isNotEmpty) ...[
          const SizedBox(height: 16),
          _buildParStatutSection(parStatut),
        ],
      ],
    );
  }

  Widget _buildEvolutionSection() {
    final evolution = _dashboard!.statistiques.evolutionMensuelle;
    final maxRevenus = evolution.fold<double>(0, (m, e) => e.revenus > m ? e.revenus : m);
    final maxReservations = evolution.fold<int>(0, (m, e) => e.reservations > m ? e.reservations : m);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Évolution mensuelle', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: evolution.map((e) {
              final hauteurRevenus = maxRevenus > 0 ? (e.revenus / maxRevenus) * 80 : 0.0;
              final hauteurReservations = maxReservations > 0 ? (e.reservations / maxReservations) * 80 : 0.0;
              return Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Column(
                  children: [
                    Text('${e.reservations}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 14, height: hauteurRevenus.clamp(4, 80).toDouble(),
                          decoration: BoxDecoration(
                            color: AppCouleurs.primaire.withValues(alpha: 0.7),
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Container(
                          width: 14, height: hauteurReservations.clamp(4, 80).toDouble(),
                          decoration: BoxDecoration(
                            color: AppCouleurs.accent.withValues(alpha: 0.7),
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(e.mois, style: const TextStyle(fontSize: 9, color: AppCouleurs.texteSecondaire)),
                    Text('${e.revenus.toStringAsFixed(0)} FC', style: const TextStyle(fontSize: 8, color: AppCouleurs.texteSecondaire)),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            _legendeCouleur(AppCouleurs.primaire, 'Revenus'),
            const SizedBox(width: 16),
            _legendeCouleur(AppCouleurs.accent, 'Réservations'),
          ],
        ),
      ],
    );
  }

  Widget _buildServicesPopulairesSection(List<ServicePopulaire> services) {
    return Carte(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Services populaires', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ...services.map((s) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text(s.nom, style: const TextStyle(fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
                Expanded(
                  flex: 1,
                  child: Text('${s.reservations} rés.', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                ),
                Expanded(
                  flex: 2,
                  child: Text('${s.revenus.toStringAsFixed(0)} FC', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire), textAlign: TextAlign.right),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildParStatutSection(List<RepartitionStatut> parStatut) {
    final total = parStatut.fold<int>(0, (sum, s) => sum + s.count);
    return Carte(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Répartition par statut', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ...parStatut.map((s) {
            final ratio = total > 0 ? s.count / total : 0.0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(_libelleStatut(s.statut), style: const TextStyle(fontSize: 12)),
                      Text('${s.count} (${(ratio * 100).toStringAsFixed(0)}%)', style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: ratio,
                      backgroundColor: AppCouleurs.fond,
                      color: _couleurStatut(s.statut),
                      minHeight: 6,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  String _libelleStatut(String statut) {
    switch (statut) {
      case 'EN_ATTENTE': return 'En attente';
      case 'CONFIRMEE': return 'Confirmée';
      case 'EN_COURS': return 'En cours';
      case 'REFUSEE': return 'Refusée';
      case 'ANNULEE': return 'Annulée';
      case 'TERMINEE': return 'Terminée';
      case 'ABSENCE': return 'Absence';
      default: return statut;
    }
  }

  Color _couleurStatut(String statut) {
    switch (statut) {
      case 'EN_ATTENTE': return AppCouleurs.avertissement;
      case 'CONFIRMEE': return AppCouleurs.succes;
      case 'EN_COURS': return AppCouleurs.primaire;
      case 'REFUSEE': return AppCouleurs.alerte;
      case 'ANNULEE': return AppCouleurs.texteSecondaire;
      case 'TERMINEE': return AppCouleurs.primaire;
      case 'ABSENCE': return AppCouleurs.alerte;
      default: return AppCouleurs.texteSecondaire;
    }
  }

  Widget _legendeCouleur(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 10, color: AppCouleurs.texteSecondaire)),
      ],
    );
  }

  Widget _buildServicesTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Mes services', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            TextButton.icon(
              onPressed: _showAjouterServiceDialog,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Ajouter', style: TextStyle(fontSize: 13)),
            ),
          ],
        ),
        if (_services.isEmpty)
          EcranVide(icone: Icons.miscellaneous_services, message: 'Aucun service proposé',
            sousTitre: 'Créez votre premier service pour commencer.')
        else
          ..._services.map((s) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Carte(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(s['nom'] as String? ?? '',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      ),
                      PopupMenuButton<String>(
                        onSelected: (v) {
                          if (v == 'modifier') _showModifierServiceDialog(s);
                          if (v == 'creneaux') _showGestionCreneaux(s);
                        },
                        itemBuilder: (_) => [
                          const PopupMenuItem(value: 'modifier', child: Text('Modifier')),
                          const PopupMenuItem(value: 'creneaux', child: Text('Gérer les créneaux')),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('${s['prix']?.toString() ?? "0"} ${s['devise'] ?? "CDF"} • ${_formaterDuree(s['dureeMinutes'] as int? ?? 0)}',
                    style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                  if (s['description'] != null && (s['description'] as String).isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(s['description'] as String,
                      style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire),
                      maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],
                ],
              ),
            ),
          )),
      ],
    );
  }

  Widget _buildAvisTab() {
    final data = _avisData;
    if (data == null) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Carte(
          child: Row(
            children: [
              Column(
                children: [
                  Text(data.noteMoyenne.toStringAsFixed(1),
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppCouleurs.accent)),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(5, (i) => Icon(
                      i < data.noteMoyenne.round() ? Icons.star : Icons.star_border,
                      size: 16, color: AppCouleurs.accent,
                    )),
                  ),
                  Text('${data.nombreAvis} avis', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                ],
              ),
              const SizedBox(width: 24),
              Expanded(
                child: Column(
                  children: [5, 4, 3, 2, 1].map((n) {
                    final count = data.repartition[n] ?? 0;
                    final total = data.nombreAvis > 0 ? count / data.nombreAvis : 0.0;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        children: [
                          Text('$n', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                          const SizedBox(width: 4),
                          Icon(Icons.star, size: 12, color: AppCouleurs.accent),
                          const SizedBox(width: 4),
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: total,
                                backgroundColor: AppCouleurs.fond,
                                color: AppCouleurs.accent,
                                minHeight: 8,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text('$count', style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (data.avis.isEmpty)
          EcranVide(icone: Icons.star_outline, message: 'Aucun avis pour le moment')
        else
          ...data.avis.map((a) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Carte(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 16, backgroundColor: AppCouleurs.primaireClair,
                        child: Text(a.clientNom[0].toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.w700, color: AppCouleurs.primaire)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(a.clientNom, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: List.generate(5, (i) => Icon(
                                i < a.note ? Icons.star : Icons.star_border,
                                size: 14, color: AppCouleurs.accent,
                              )),
                            ),
                          ],
                        ),
                      ),
                      Text(a.creeLe.substring(0, 10),
                        style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                    ],
                  ),
                  if (a.commentaire != null && a.commentaire!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(a.commentaire!, style: const TextStyle(fontSize: 13)),
                  ],
                  if (a.reponsePrestataire != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppCouleurs.fond,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.reply, size: 14, color: AppCouleurs.primaire),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(a.reponsePrestataire!,
                                  style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    TextButton(
                                      onPressed: () => _showRepondreAvisDialog(a, reponseExistante: a.reponsePrestataire),
                                      style: TextButton.styleFrom(
                                        visualDensity: VisualDensity.compact,
                                        padding: const EdgeInsets.symmetric(horizontal: 8),
                                        minimumSize: const Size(0, 32),
                                      ),
                                      child: const Text('Modifier', style: TextStyle(fontSize: 11, color: AppCouleurs.primaire)),
                                    ),
                                    TextButton(
                                      onPressed: () => _supprimerReponseAvis(a),
                                      style: TextButton.styleFrom(
                                        visualDensity: VisualDensity.compact,
                                        padding: const EdgeInsets.symmetric(horizontal: 8),
                                        minimumSize: const Size(0, 32),
                                      ),
                                      child: const Text('Supprimer', style: TextStyle(fontSize: 11, color: AppCouleurs.alerte)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else if (a.reponsePrestataire == null) ...[
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: () => _showRepondreAvisDialog(a),
                      icon: const Icon(Icons.reply, size: 14),
                      label: const Text('Répondre', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ],
              ),
            ),
          )),
      ],
    );
  }

  DashboardStats? get stats => _dashboard?.statistiques;

  void _showAjouterServiceDialog() {
    final nomCtrl = TextEditingController();
    final prixCtrl = TextEditingController();
    final dureeCtrl = TextEditingController(text: '1');
    final descCtrl = TextEditingController();
    String devise = 'CDF';
    String categorie = CategorieService.sante;
    String uniteDuree = 'heures';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) {
        int calculerMinutes() {
          final val = int.tryParse(dureeCtrl.text) ?? 0;
          switch (uniteDuree) {
            case 'jours': return val * 1440;
            case 'heures': return val * 60;
            default: return val;
          }
        }

        return AlertDialog(
          title: const Text('Nouveau service'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nomCtrl, decoration: const InputDecoration(labelText: 'Nom du service', hintText: 'Ex: Consultation')),
                const SizedBox(height: 8),
                TextField(controller: prixCtrl, decoration: const InputDecoration(labelText: 'Prix'), keyboardType: TextInputType.number),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: devise, decoration: const InputDecoration(labelText: 'Devise'),
                  items: const [
                    DropdownMenuItem(value: 'CDF', child: Text('CDF')),
                    DropdownMenuItem(value: 'USD', child: Text('USD')),
                  ],
                  onChanged: (v) => setDialogState(() => devise = v!),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextField(controller: dureeCtrl, decoration: const InputDecoration(labelText: 'Durée'), keyboardType: TextInputType.number),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 3,
                      child: DropdownButtonFormField<String>(
                        value: uniteDuree,
                        decoration: const InputDecoration(labelText: 'Unité'),
                        items: const [
                          DropdownMenuItem(value: 'minutes', child: Text('Minutes')),
                          DropdownMenuItem(value: 'heures', child: Text('Heures')),
                          DropdownMenuItem(value: 'jours', child: Text('Jours')),
                        ],
                        onChanged: (v) {
                          if (v != null) {
                            final ancienne = uniteDuree;
                            setDialogState(() => uniteDuree = v);
                            final val = int.tryParse(dureeCtrl.text) ?? 0;
                            if (val > 0) {
                              int minutes;
                              switch (ancienne) {
                                case 'jours': minutes = val * 1440; break;
                                case 'heures': minutes = val * 60; break;
                                default: minutes = val;
                              }
                              int nouvelleVal;
                              switch (v) {
                                case 'jours': nouvelleVal = minutes ~/ 1440; break;
                                case 'heures': nouvelleVal = minutes ~/ 60; break;
                                default: nouvelleVal = minutes;
                              }
                              if (nouvelleVal > 0) dureeCtrl.text = '$nouvelleVal';
                            }
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: categorie, decoration: const InputDecoration(labelText: 'Catégorie'),
                  items: CategorieService.values.map((c) => DropdownMenuItem(value: c, child: Text(CategorieService.libelle(c)))).toList(),
                  onChanged: (v) => setDialogState(() => categorie = v!),
                ),
                const SizedBox(height: 8),
                TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 3),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () async {
                if (nomCtrl.text.isEmpty || prixCtrl.text.isEmpty) return;
                try {
                  await ApiPrestataire.creerService({
                    'nom': nomCtrl.text,
                    'prix': double.parse(prixCtrl.text),
                    'devise': devise,
                    'dureeMinutes': calculerMinutes(),
                    'categorie': categorie,
                    'description': descCtrl.text,
                  });
                  if (ctx.mounted) Navigator.pop(ctx);
                  _charger();
                  if (mounted) ToastWidget.show(context, 'Service créé', type: 'succes');
                } catch (e) {
                  if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
                }
              },
              child: const Text('Créer'),
            ),
          ],
        );
      }),
    );
  }

  void _showModifierServiceDialog(Map<String, dynamic> service) {
    final minutesExistantes = service['dureeMinutes'] as int? ?? 60;
    String initialUnite;
    int initialValeur;
    if (minutesExistantes % 1440 == 0 && minutesExistantes >= 1440) {
      initialUnite = 'jours';
      initialValeur = minutesExistantes ~/ 1440;
    } else if (minutesExistantes % 60 == 0 && minutesExistantes >= 60) {
      initialUnite = 'heures';
      initialValeur = minutesExistantes ~/ 60;
    } else {
      initialUnite = 'minutes';
      initialValeur = minutesExistantes;
    }

    final nomCtrl = TextEditingController(text: service['nom'] as String? ?? '');
    final prixCtrl = TextEditingController(text: '${service['prix'] ?? ""}');
    final dureeCtrl = TextEditingController(text: '$initialValeur');
    final descCtrl = TextEditingController(text: service['description'] as String? ?? '');
    String devise = service['devise'] as String? ?? 'CDF';
    String categorie = service['categorie'] as String? ?? CategorieService.sante;
    String uniteDuree = initialUnite;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) {
        int calculerMinutes() {
          final val = int.tryParse(dureeCtrl.text) ?? 0;
          switch (uniteDuree) {
            case 'jours': return val * 1440;
            case 'heures': return val * 60;
            default: return val;
          }
        }

        return AlertDialog(
          title: const Text('Modifier le service'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nomCtrl, decoration: const InputDecoration(labelText: 'Nom')),
                const SizedBox(height: 8),
                TextField(controller: prixCtrl, decoration: const InputDecoration(labelText: 'Prix'), keyboardType: TextInputType.number),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: devise, decoration: const InputDecoration(labelText: 'Devise'),
                  items: const [
                    DropdownMenuItem(value: 'CDF', child: Text('CDF')),
                    DropdownMenuItem(value: 'USD', child: Text('USD')),
                  ],
                  onChanged: (v) => setDialogState(() => devise = v!),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextField(controller: dureeCtrl, decoration: const InputDecoration(labelText: 'Durée'), keyboardType: TextInputType.number),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 3,
                      child: DropdownButtonFormField<String>(
                        value: uniteDuree,
                        decoration: const InputDecoration(labelText: 'Unité'),
                        items: const [
                          DropdownMenuItem(value: 'minutes', child: Text('Minutes')),
                          DropdownMenuItem(value: 'heures', child: Text('Heures')),
                          DropdownMenuItem(value: 'jours', child: Text('Jours')),
                        ],
                        onChanged: (v) {
                          if (v != null) {
                            final ancienne = uniteDuree;
                            setDialogState(() => uniteDuree = v);
                            final val = int.tryParse(dureeCtrl.text) ?? 0;
                            if (val > 0) {
                              int minutes;
                              switch (ancienne) {
                                case 'jours': minutes = val * 1440; break;
                                case 'heures': minutes = val * 60; break;
                                default: minutes = val;
                              }
                              int nouvelleVal;
                              switch (v) {
                                case 'jours': nouvelleVal = minutes ~/ 1440; break;
                                case 'heures': nouvelleVal = minutes ~/ 60; break;
                                default: nouvelleVal = minutes;
                              }
                              if (nouvelleVal > 0) dureeCtrl.text = '$nouvelleVal';
                            }
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: categorie, decoration: const InputDecoration(labelText: 'Catégorie'),
                  items: CategorieService.values.map((c) => DropdownMenuItem(value: c, child: Text(CategorieService.libelle(c)))).toList(),
                  onChanged: (v) => setDialogState(() => categorie = v!),
                ),
                const SizedBox(height: 8),
                TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 3),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () async {
                try {
                  await ApiPrestataire.modifierService(service['id'] as String, {
                    'nom': nomCtrl.text,
                    'prix': double.parse(prixCtrl.text),
                    'devise': devise,
                    'dureeMinutes': calculerMinutes(),
                    'categorie': categorie,
                    'description': descCtrl.text,
                  });
                  if (ctx.mounted) Navigator.pop(ctx);
                  _charger();
                  if (mounted) ToastWidget.show(context, 'Service modifié', type: 'succes');
                } catch (e) {
                  if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
                }
              },
              child: const Text('Enregistrer'),
            ),
          ],
        );
      }),
    );
  }

  void _showGestionCreneaux(Map<String, dynamic> service) async {
    final serviceId = service['id'] as String;
    final nom = service['nom'] as String? ?? '';
    List<dynamic> creneaux = [];

    try {
      creneaux = await ApiPrestataire.listerCreneauxService(serviceId);
    } catch (_) {}

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheetState) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.7,
          minChildSize: 0.4,
          maxChildSize: 0.95,
          builder: (_, scrollCtrl) => Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(
                  color: AppCouleurs.bordure, borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text('Créneaux — $nom', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add_circle, color: AppCouleurs.primaire),
                      onPressed: () => _showAjouterCreneauDialog(serviceId, () async {
                        creneaux = await ApiPrestataire.listerCreneauxService(serviceId);
                        setSheetState(() {});
                      }),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: creneaux.isEmpty
                    ? EcranVide(icone: Icons.schedule, message: 'Aucun créneau',
                        sousTitre: 'Ajoutez des créneaux de disponibilité.')
                    : ListView.separated(
                        controller: scrollCtrl,
                        itemCount: creneaux.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, i) {
                          final c = creneaux[i];
                          final debut = c['debut'] as String? ?? '';
                          final fin = c['fin'] as String? ?? '';
                          final capTotale = c['capaciteTotale'] as int? ?? 1;
                          final capReservee = c['capaciteReservee'] as int? ?? 0;
                          return ListTile(
                            title: Text('${debut.substring(11, 16)} - ${fin.substring(11, 16)}',
                              style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text('${debut.substring(0, 10)} • Places: ${capTotale - capReservee}/$capTotale',
                              style: const TextStyle(fontSize: 12)),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete_outline, color: AppCouleurs.alerte, size: 20),
                              onPressed: capReservee > 0 ? null : () async {
                                try {
                                  await ApiPrestataire.supprimerCreneau(c['id'] as String);
                                  creneaux = await ApiPrestataire.listerCreneauxService(serviceId);
                                  setSheetState(() {});
                                  if (mounted) ToastWidget.show(context, 'Créneau supprimé', type: 'succes');
                                } catch (e) {
                                  if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
                                }
                              },
                            ),
                          );
                        },
                      ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  void _showAjouterCreneauDialog(String serviceId, VoidCallback onRafraichir) {
    final dateCtrl = TextEditingController();
    final debutCtrl = TextEditingController(text: '09:00');
    final finCtrl = TextEditingController(text: '10:00');
    final capCtrl = TextEditingController(text: '1');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) {
        return AlertDialog(
          title: const Text('Nouveau créneau'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: dateCtrl,
                  decoration: InputDecoration(
                    labelText: 'Date',
                    hintText: '2026-07-15',
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.calendar_today),
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          initialDate: DateTime.now(),
                          firstDate: DateTime.now().subtract(const Duration(days: 30)),
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) {
                          final y = picked.year.toString();
                          final m = picked.month.toString().padLeft(2, '0');
                          final d = picked.day.toString().padLeft(2, '0');
                          dateCtrl.text = '$y-$m-$d';
                          setDialogState(() {});
                        }
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(controller: debutCtrl, decoration: const InputDecoration(labelText: 'Début (HH:MM)')),
                const SizedBox(height: 8),
                TextField(controller: finCtrl, decoration: const InputDecoration(labelText: 'Fin (HH:MM)')),
                const SizedBox(height: 8),
                TextField(controller: capCtrl, decoration: const InputDecoration(labelText: 'Capacité'), keyboardType: TextInputType.number),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () async {
                try {
                  await ApiPrestataire.creerCreneau({
                    'serviceId': serviceId,
                    'debut': '${dateCtrl.text}T${debutCtrl.text}:00.000Z',
                    'fin': '${dateCtrl.text}T${finCtrl.text}:00.000Z',
                    'capaciteTotale': int.parse(capCtrl.text),
                  });
                  if (ctx.mounted) Navigator.pop(ctx);
                  onRafraichir();
                  if (mounted) ToastWidget.show(context, 'Créneau ajouté', type: 'succes');
                } catch (e) {
                  if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
                }
              },
              child: const Text('Ajouter'),
            ),
          ],
        );
      }),
    );
  }

  void _showRepondreAvisDialog(AvisRecu avis, {String? reponseExistante}) {
    final repCtrl = TextEditingController(text: reponseExistante ?? '');
    final estModification = reponseExistante != null;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(estModification ? 'Modifier la réponse' : 'Répondre à l\'avis'),
        content: TextField(
          controller: repCtrl,
          maxLines: 3,
          maxLength: 500,
          decoration: const InputDecoration(hintText: 'Votre réponse...'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              if (repCtrl.text.trim().isEmpty) return;
              try {
                if (estModification) {
                  await ApiPrestataire.modifierReponseAvis(avis.id, repCtrl.text.trim());
                } else {
                  await ApiPrestataire.repondreAvis(avis.id, repCtrl.text.trim());
                }
                if (ctx.mounted) Navigator.pop(ctx);
                _charger();
                if (mounted) ToastWidget.show(context, 'Réponse publiée', type: 'succes');
              } catch (e) {
                if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
              }
            },
            child: const Text('Publier'),
          ),
        ],
      ),
    );
  }

  Future<void> _supprimerReponseAvis(AvisRecu avis) async {
    final confirme = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer la réponse ?'),
        content: const Text('Cette action retirera votre réponse publique à cet avis.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Supprimer', style: TextStyle(color: AppCouleurs.alerte)),
          ),
        ],
      ),
    );
    if (confirme != true || !mounted) return;
    try {
      await ApiPrestataire.supprimerReponseAvis(avis.id);
      _charger();
      if (mounted) ToastWidget.show(context, 'Réponse supprimée', type: 'succes');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  Future<void> _repondreReservation(String reservationId, bool approuver) async {
    try {
      await ApiPrestataire.repondreReservation(reservationId, approuver);
      _charger();
      if (mounted) ToastWidget.show(context, approuver ? 'Réservation acceptée' : 'Réservation refusée', type: 'succes');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  Future<void> _entamerReservation(String reservationId) async {
    try {
      await ApiPrestataire.entamerReservation(reservationId);
      _charger();
      if (mounted) ToastWidget.show(context, 'Prestation démarrée', type: 'succes');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  Future<void> _cloturerReservation(String reservationId) async {
    final statut = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Clôturer la prestation'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, 'TERMINEE'),
            child: const Row(
              children: [
                Icon(Icons.task_alt, color: AppCouleurs.succes),
                SizedBox(width: 12),
                Text('Terminée'),
              ],
            ),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, 'ABSENCE'),
            child: const Row(
              children: [
                Icon(Icons.person_off, color: AppCouleurs.alerte),
                SizedBox(width: 12),
                Text('Absence (no-show)'),
              ],
            ),
          ),
        ],
      ),
    );
    if (statut == null || !mounted) return;
    try {
      await ApiPrestataire.cloturerReservation(reservationId, statut: statut);
      _charger();
      if (mounted) {
        ToastWidget.show(context, statut == 'TERMINEE' ? 'Réservation terminée' : 'Marquée comme absence', type: 'succes');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  void _ouvrirScanner() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const ScanQrScreen()),
    ).then((_) {
      if (mounted) _charger();
    });
  }

  Future<void> _partagerRapport() async {
    try {
      final csv = await ApiPrestataire.telechargerRapportCsv();
      if (!mounted) return;
      await Share.share(csv, subject: 'Rapport des réservations RESERVA');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  Widget _buildBandeauHorsLigne() {
    final date = ApiPrestataire.cacheSauvegardeLe;
    final texte = date != null
        ? 'Mode hors ligne — données du ${CacheHorsLigne.formaterDate(date)}'
        : 'Mode hors ligne — données enregistrées';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppCouleurs.avertissement.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.cloud_off, size: 18, color: AppCouleurs.avertissement),
          const SizedBox(width: 8),
          Expanded(
            child: Text(texte, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppCouleurs.avertissement)),
          ),
        ],
      ),
    );
  }
}
