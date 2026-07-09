import 'package:flutter/material.dart';
import '../../theme.dart';
import 'plans_screen.dart';
import 'tarifications_screen.dart';
import 'stats_screen.dart';
import 'prestataires_list_screen.dart';
import 'utilisateurs_list_screen.dart';

class AdminShell extends StatelessWidget {
  const AdminShell({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 5,
      child: Scaffold(
        backgroundColor: AppCouleurs.fond,
        appBar: AppBar(
          title: const Text('Administration'),
          bottom: const TabBar(
            isScrollable: true,
            labelColor: AppCouleurs.primaire,
            unselectedLabelColor: AppCouleurs.texteSecondaire,
            indicatorColor: AppCouleurs.primaire,
            tabs: [
              Tab(icon: Icon(Icons.dashboard), text: 'Stats'),
              Tab(icon: Icon(Icons.business), text: 'Prestataires'),
              Tab(icon: Icon(Icons.people), text: 'Utilisateurs'),
              Tab(icon: Icon(Icons.card_membership), text: 'Abonnements'),
              Tab(icon: Icon(Icons.price_change), text: 'Tarifs'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            StatsScreen(),
            PrestatairesListScreen(),
            UtilisateursListScreen(),
            PlansScreen(),
            TarificationsScreen(),
          ],
        ),
      ),
    );
  }
}
