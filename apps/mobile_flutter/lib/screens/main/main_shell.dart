import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../app_flavor.dart';
import '../../theme.dart';
import '../../i18n.dart';
import '../../providers/auth_provider.dart';
import '../../providers/langue_provider.dart';
import '../../widgets/connectivity_banner.dart';
import '../../widgets/badge_notification.dart';
import 'accueil_screen.dart';
import 'services_screen.dart';
import 'reservations_screen.dart';
import 'prestataire_screen.dart';
import 'profil_screen.dart';
import '../chat/conversations_screen.dart';

/// Indices d'onglets stables selon le rôle (évite Profil quand on veut Réservations).
class MainShellTabs {
  static bool montreReservations(AuthProvider auth) => !auth.estPrestataire;
  static bool montreMessages(AuthProvider auth) => auth.estConnecte && !auth.estAdmin;
  static bool montrePrestataire(AuthProvider auth) => auth.estPrestataire;
  static bool montreAdmin(AuthProvider auth) => auth.estAdmin;

  static int indexAccueil() => 0;
  static int indexServices() => 1;

  static int indexReservations(AuthProvider auth) {
    if (!montreReservations(auth)) return indexAccueil();
    return 2;
  }

  static int indexProfil(AuthProvider auth) {
    var i = 2;
    if (montreReservations(auth)) i++;
    return i;
  }

  static int indexMessages(AuthProvider auth) {
    if (!montreMessages(auth)) return indexProfil(auth);
    return indexProfil(auth) + 1;
  }

  static int indexPrestataire(AuthProvider auth) {
    if (!montrePrestataire(auth)) return indexProfil(auth);
    var i = indexProfil(auth) + 1;
    if (montreMessages(auth)) i++;
    return i;
  }

  static int indexAdmin(AuthProvider auth) {
    if (!montreAdmin(auth)) return indexProfil(auth);
    var i = indexProfil(auth) + 1;
    if (montreMessages(auth)) i++;
    if (montrePrestataire(auth)) i++;
    return i;
  }

  /// Accueil client ; espace Pro par défaut pour prestataires / flavor Pro.
  static int ongletParDefaut(AuthProvider auth) {
    if (auth.estPrestataire || AppFlavorConfig.estPrestataire) {
      return indexPrestataire(auth);
    }
    return indexAccueil();
  }

  static int compter(AuthProvider auth) {
    var n = 3; // accueil, services, profil
    if (montreReservations(auth)) n++;
    if (montreMessages(auth)) n++;
    if (montrePrestataire(auth)) n++;
    if (montreAdmin(auth)) n++;
    return n;
  }
}

class MainShell extends StatefulWidget {
  final int? ongletInitial;
  const MainShell({super.key, this.ongletInitial});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  late int _index;
  bool _ongletInitialise = false;

  @override
  void initState() {
    super.initState();
    _index = widget.ongletInitial ?? 0;
    if (widget.ongletInitial != null) _ongletInitialise = true;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = context.read<AuthProvider>();
    final max = MainShellTabs.compter(auth) - 1;
    if (!_ongletInitialise) {
      _index = MainShellTabs.ongletParDefaut(auth).clamp(0, max);
      _ongletInitialise = true;
    } else if (_index > max) {
      _index = max;
    }
  }

  @override
  Widget build(BuildContext context) {
    context.watch<LangueProvider>();
    final auth = context.watch<AuthProvider>();
    final destinations = <NavigationDestination>[
      NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home), label: AppTraductions.t('accueil')),
      NavigationDestination(icon: const Icon(Icons.search_outlined), selectedIcon: const Icon(Icons.search), label: AppTraductions.t('recherche')),
      if (MainShellTabs.montreReservations(auth))
        NavigationDestination(icon: const Icon(Icons.calendar_month_outlined), selectedIcon: const Icon(Icons.calendar_month), label: AppTraductions.t('navReservations')),
      NavigationDestination(
        icon: BadgeNotification(child: const Icon(Icons.person_outline)),
        selectedIcon: BadgeNotification(child: const Icon(Icons.person)),
        label: AppTraductions.t('profil'),
      ),
      if (MainShellTabs.montreMessages(auth))
        NavigationDestination(icon: const Icon(Icons.chat_outlined), selectedIcon: const Icon(Icons.chat), label: AppTraductions.t('navMessages')),
      if (MainShellTabs.montrePrestataire(auth))
        NavigationDestination(icon: const Icon(Icons.dashboard_outlined), selectedIcon: const Icon(Icons.dashboard), label: AppTraductions.t('navPrestataire')),
      if (MainShellTabs.montreAdmin(auth))
        const NavigationDestination(icon: Icon(Icons.admin_panel_settings_outlined), selectedIcon: Icon(Icons.admin_panel_settings), label: 'Admin'),
    ];

    final pages = <Widget>[
      const AccueilScreen(),
      const ServicesScreen(),
      if (MainShellTabs.montreReservations(auth)) const ReservationsScreen(),
      const ProfilScreen(),
      if (MainShellTabs.montreMessages(auth)) const ConversationsScreen(),
      if (MainShellTabs.montrePrestataire(auth)) const PrestataireScreen(),
      if (MainShellTabs.montreAdmin(auth)) const AdminButtonTab(),
    ];

    final safeIndex = _index.clamp(0, pages.length - 1);
    final navBg = Theme.of(context).bottomNavigationBarTheme.backgroundColor ?? AppCouleurs.blanc;

    return Scaffold(
      body: ConnectivityBanner(
        // IndexedStack : pas de swipe accidentel, état des onglets conservé
        child: IndexedStack(index: safeIndex, children: pages),
      ),
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          backgroundColor: navBg,
          indicatorColor: AppCouleurs.primaireClair,
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return TextStyle(
              fontSize: 11,
              height: 1.0,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected ? AppCouleurs.primaire : AppCouleurs.texteSecondaire,
            );
          }),
        ),
        child: NavigationBar(
          selectedIndex: safeIndex,
          onDestinationSelected: (i) {
            if (i == safeIndex) return;
            setState(() => _index = i);
          },
          destinations: destinations,
          height: 64,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
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
