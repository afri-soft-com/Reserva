import 'package:go_router/go_router.dart';
import 'providers/auth_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/auth/connexion_screen.dart';
import 'screens/auth/inscription_screen.dart';
import 'screens/auth/reinitialiser_pin_screen.dart';
import 'screens/main/main_shell.dart';
import 'screens/main/services_screen.dart';
import 'screens/service/service_detail_screen.dart';
import 'screens/reservation/reservation_detail_screen.dart';
import 'screens/admin/admin_shell.dart';
import 'screens/paiement/paiement_screen.dart';
import 'screens/avis/avis_screen.dart';
import 'screens/notifications/notifications_screen.dart';
import 'screens/paiement/historique_transactions_screen.dart';
import 'screens/main/modifier_profil_screen.dart';
import 'screens/main/changer_pin_screen.dart';
import 'screens/main/favoris_screen.dart';
import 'screens/chat/conversations_screen.dart';
import 'screens/chat/conversation_detail_screen.dart';
import 'screens/fidelite/fidelite_screen.dart';
import 'screens/cartes_cadeaux/cartes_cadeaux_screen.dart';
import 'screens/cartes_cadeaux/acheter_carte_cadeau_screen.dart';
import 'screens/cartes_cadeaux/detail_carte_cadeau_screen.dart';
import 'screens/parrainage/parrainage_screen.dart';

GoRouter createRouter(AuthProvider auth) {
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: auth,
    redirect: (context, state) {
      final estConnecte = auth.estConnecte;
      final chargementInitial = auth.chargementInitial;
      final path = state.uri.toString();

      if (chargementInitial) return null;
      if (path == '/splash') return null;

      final routesPubliques = ['/connexion', '/inscription', '/reinitialiser-pin'];
      final estRoutePublique = routesPubliques.any((r) => path.startsWith(r));

      if (!estConnecte && !estRoutePublique) return '/connexion';
      if (estConnecte && estRoutePublique) return '/accueil';

      if (path.startsWith('/admin') && !auth.estAdmin) return '/accueil';

      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (ctx, state) => SplashScreen(
        onTermine: () {
          if (auth.estConnecte) {
            ctx.go('/accueil');
          } else {
            ctx.go('/connexion');
          }
        },
      )),
      GoRoute(path: '/connexion', builder: (ctx, state) => const ConnexionScreen()),
      GoRoute(path: '/inscription', builder: (ctx, state) => const InscriptionScreen()),
      GoRoute(path: '/reinitialiser-pin', builder: (ctx, state) => const ReinitialiserPinScreen()),
      GoRoute(path: '/accueil', builder: (ctx, state) => const MainShell()),
      GoRoute(
        path: '/reservations',
        builder: (ctx, state) => const MainShell(ongletInitial: 2),
      ),
      GoRoute(path: '/services', builder: (ctx, state) {
        final categorie = state.extra as String?;
        return ServicesScreen(categorie: categorie);
      }),
      GoRoute(
        path: '/service/:id',
        builder: (ctx, state) => ServiceDetailScreen(serviceId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/reservation/:id',
        builder: (ctx, state) => ReservationDetailScreen(reservationId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/admin',
        builder: (ctx, state) => const AdminShell(),
      ),
      GoRoute(
        path: '/paiement/:id',
        builder: (ctx, state) => PaiementScreen(reservationId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/avis/:id',
        builder: (ctx, state) => AvisScreen(reservationId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/transactions/:id',
        builder: (ctx, state) => HistoriqueTransactionsScreen(reservationId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/notifications',
        builder: (ctx, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/modifier-profil',
        builder: (ctx, state) => const ModifierProfilScreen(),
      ),
      GoRoute(
        path: '/changer-pin',
        builder: (ctx, state) => const ChangerPinScreen(),
      ),
      GoRoute(
        path: '/favoris',
        builder: (ctx, state) => const FavorisScreen(),
      ),
      GoRoute(
        path: '/fidelite',
        builder: (ctx, state) => const FideliteScreen(),
      ),
      GoRoute(
        path: '/conversations',
        builder: (ctx, state) => const ConversationsScreen(),
      ),
      GoRoute(
        path: '/conversations/:id',
        builder: (ctx, state) => ConversationDetailScreen(
            conversationId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/cartes-cadeaux',
        builder: (ctx, state) => const CartesCadeauxScreen(),
      ),
      GoRoute(
        path: '/cartes-cadeaux/acheter',
        builder: (ctx, state) => const AcheterCarteCadeauScreen(),
      ),
      GoRoute(
        path: '/cartes-cadeaux/:code',
        builder: (ctx, state) => DetailCarteCadeauScreen(code: state.pathParameters['code']!),
      ),
      GoRoute(
        path: '/parrainage',
        builder: (ctx, state) => const ParrainageScreen(),
      ),
    ],
  );
}
