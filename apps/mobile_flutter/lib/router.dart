import 'package:go_router/go_router.dart';
import 'providers/auth_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/auth/bienvenue_screen.dart';
import 'screens/auth/connexion_screen.dart';
import 'screens/auth/inscription_screen.dart';
import 'screens/auth/reinitialiser_pin_screen.dart';
import 'screens/legal/cgu_screen.dart';
import 'screens/legal/manuel_utilisateur_screen.dart';
import 'screens/main/main_shell.dart';
import 'app_flavor.dart';
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
import 'screens/portefeuille/portefeuille_screen.dart';
import 'screens/cartes_cadeaux/cartes_cadeaux_screen.dart';
import 'screens/cartes_cadeaux/acheter_carte_cadeau_screen.dart';
import 'screens/cartes_cadeaux/detail_carte_cadeau_screen.dart';
import 'screens/parrainage/parrainage_screen.dart';
import 'screens/package/package_detail_screen.dart';
import 'screens/alertes/alertes_screen.dart';
import 'screens/attentes/attentes_screen.dart';
import 'screens/prestataire/calendrier_prestataire_screen.dart';
import 'screens/hotels/hotels_recherche_screen.dart';
import 'screens/hotels/hotel_detail_screen.dart';
import 'screens/hotels/hotel_checkout_screen.dart';
import 'screens/hotels/hotel_sejour_screen.dart';
import 'screens/transport/transport_recherche_screen.dart';
import 'screens/transport/transport_detail_screen.dart';
import 'screens/transport/transport_checkout_screen.dart';
import 'screens/transport/transport_billet_screen.dart';
import 'screens/voyages/voyages_hub_screen.dart';
import 'screens/famille/beneficiaires_screen.dart';
import 'screens/innovations/corridors_screen.dart';
import 'screens/prestataire/kyc_screen.dart';

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

      final routesPubliques = [
        '/bienvenue',
        '/connexion',
        '/inscription',
        '/reinitialiser-pin',
        '/cgu',
        '/manuel',
      ];
      final estRoutePublique = routesPubliques.any((r) => path == r || path.startsWith('$r?'));

      if (!estConnecte && !estRoutePublique) return '/bienvenue';
      if (estConnecte && (path == '/bienvenue' || path == '/connexion' || path == '/inscription')) {
        return '/accueil';
      }

      if (path.startsWith('/admin') && !auth.estAdmin) return '/accueil';

      // App Pro : bloquer l'accès client-only aux espaces prestataire inversés n'est pas nécessaire ;
      // le garde-fou principal est le rôle à la connexion.
      if (AppFlavorConfig.estClient && path.startsWith('/prestataire')) {
        return '/accueil';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (ctx, state) => SplashScreen(
        onTermine: () {
          if (auth.estConnecte) {
            ctx.go('/accueil');
          } else {
            ctx.go('/bienvenue');
          }
        },
      )),
      GoRoute(path: '/bienvenue', builder: (ctx, state) => const BienvenueScreen()),
      GoRoute(path: '/connexion', builder: (ctx, state) => const ConnexionScreen()),
      GoRoute(path: '/inscription', builder: (ctx, state) => const InscriptionScreen()),
      GoRoute(path: '/reinitialiser-pin', builder: (ctx, state) => const ReinitialiserPinScreen()),
      GoRoute(path: '/cgu', builder: (ctx, state) => const CguScreen()),
      GoRoute(path: '/manuel', builder: (ctx, state) => const ManuelUtilisateurScreen()),
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
        path: '/portefeuille',
        builder: (ctx, state) => const PortefeuilleScreen(),
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
      GoRoute(
        path: '/famille',
        builder: (ctx, state) => const BeneficiairesScreen(),
      ),
      GoRoute(
        path: '/corridors',
        builder: (ctx, state) => const CorridorsScreen(),
      ),
      GoRoute(
        path: '/package/:id',
        builder: (ctx, state) => PackageDetailScreen(packageId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/alertes',
        builder: (ctx, state) => const AlertesScreen(),
      ),
      GoRoute(
        path: '/attentes',
        builder: (ctx, state) => const AttentesScreen(),
      ),
      GoRoute(
        path: '/prestataire/calendrier',
        builder: (ctx, state) => const CalendrierPrestataireScreen(),
      ),
      GoRoute(
        path: '/prestataire/kyc',
        builder: (ctx, state) => const KycScreen(),
      ),
      GoRoute(path: '/voyages', builder: (ctx, state) => const VoyagesHubScreen()),
      GoRoute(path: '/hotels', builder: (ctx, state) => const HotelsRechercheScreen()),
      GoRoute(
        path: '/hotels/checkout/:id',
        builder: (ctx, state) => HotelCheckoutScreen(sejourId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/hotels/sejour/:id',
        builder: (ctx, state) => HotelSejourScreen(sejourId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/hotels/:id',
        builder: (ctx, state) {
          final extra = (state.extra as Map?) ?? {};
          return HotelDetailScreen(
            hotelId: state.pathParameters['id']!,
            arrivee: '${extra['arrivee'] ?? ''}',
            depart: '${extra['depart'] ?? ''}',
            adultes: (extra['adultes'] as int?) ?? 2,
            enfants: (extra['enfants'] as int?) ?? 0,
          );
        },
      ),
      GoRoute(path: '/transport', builder: (ctx, state) => const TransportRechercheScreen()),
      GoRoute(
        path: '/transport/checkout/:id',
        builder: (ctx, state) => TransportCheckoutScreen(billetId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/transport/billet/:id',
        builder: (ctx, state) => TransportBilletScreen(billetId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/transport/:id',
        builder: (ctx, state) {
          final extra = (state.extra as Map?) ?? {};
          return TransportDetailScreen(
            trajetId: state.pathParameters['id']!,
            places: (extra['places'] as int?) ?? 1,
          );
        },
      ),
    ],
  );
}
