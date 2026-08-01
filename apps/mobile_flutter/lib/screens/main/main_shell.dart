import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/connectivity_banner.dart';
import '../../widgets/badge_notification.dart';
import 'accueil_screen.dart';
import 'services_screen.dart';
import 'reservations_screen.dart';
import 'prestataire_screen.dart';
import 'profil_screen.dart';
import '../chat/conversations_screen.dart';

class MainShell extends StatelessWidget {
  final int ongletInitial;
  const MainShell({super.key, this.ongletInitial = 0});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final montreMessages = auth.estConnecte && !auth.estAdmin;
    final montreReservations = !auth.estPrestataire;
    final nbTabs = 3
        + (montreReservations ? 1 : 0)
        + (montreMessages ? 1 : 0)
        + (auth.estPrestataire ? 1 : 0)
        + (auth.estAdmin ? 1 : 0);
    return DefaultTabController(
      length: nbTabs,
      initialIndex: ongletInitial.clamp(0, nbTabs - 1).toInt(),
      child: Scaffold(
        body: ConnectivityBanner(
          child: TabBarView(
            children: [
              const AccueilScreen(),
              const ServicesScreen(),
              if (montreReservations) const ReservationsScreen(),
              const ProfilScreen(),
              if (montreMessages) const ConversationsScreen(),
              if (auth.estPrestataire) const PrestataireScreen(),
              if (auth.estAdmin) const AdminButtonTab(),
            ],
          ),
        ),
        bottomNavigationBar: TabBar(
          labelColor: AppCouleurs.primaire,
          unselectedLabelColor: AppCouleurs.texteSecondaire,
          indicatorColor: AppCouleurs.primaire,
          tabs: [
            Tab(icon: const Icon(Icons.home), text: 'Accueil'),
            Tab(icon: const Icon(Icons.search), text: 'Rechercher'),
            if (montreReservations) Tab(icon: const Icon(Icons.calendar_month), text: 'Réservations'),
            Tab(
              icon: BadgeNotification(child: Icon(Icons.person)),
              text: 'Profil',
            ),
            if (montreMessages) Tab(icon: const Icon(Icons.chat), text: 'Messages'),
            if (auth.estPrestataire) Tab(icon: const Icon(Icons.dashboard), text: 'Espace'),
            if (auth.estAdmin) Tab(icon: const Icon(Icons.admin_panel_settings), text: 'Admin'),
          ],
        ),
      ),
    );
  }
}

class AdminButtonTab extends StatelessWidget {
  const AdminButtonTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.admin_panel_settings, size: 64, color: AppCouleurs.primaire),
            const SizedBox(height: 16),
            const Text('Panneau d\'administration', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppCouleurs.texte)),
            const SizedBox(height: 8),
            const Text('Gérez les abonnements et les tarifications.', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => context.go('/admin'),
              icon: const Icon(Icons.open_in_new),
              label: const Text('Ouvrir l\'administration'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCouleurs.primaire,
                foregroundColor: AppCouleurs.blanc,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
