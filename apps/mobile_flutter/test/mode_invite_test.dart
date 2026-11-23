import 'package:flutter_test/flutter_test.dart';
import 'package:reserva/router.dart';

void main() {
  group('Mode invité (App Store 5.1.1(v))', () {
    test('le catalogue se parcourt sans compte', () {
      for (final route in [
        '/accueil',
        '/services',
        '/services?q=coiffure',
        '/service/abc',
        '/package/p1',
        '/voyages',
        '/hotels',
        '/hotels/h1',
        '/transport',
        '/transport/t1',
      ]) {
        expect(estRouteNavigationInvite(route), isTrue, reason: route);
      }
    });

    test('les pages de compte, paiements, séjours et billets restent protégés', () {
      for (final route in [
        '/reservations',
        '/reservation/r1',
        '/paiement/r1',
        '/favoris',
        '/conversations',
        '/portefeuille',
        '/notifications',
        '/hotels/checkout/s1',
        '/hotels/sejour/s1',
        '/transport/checkout/b1',
        '/transport/billet/b1',
        '/admin',
      ]) {
        expect(estRouteNavigationInvite(route), isFalse, reason: route);
      }
    });
  });
}
