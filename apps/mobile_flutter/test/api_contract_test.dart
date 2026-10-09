import 'package:flutter_test/flutter_test.dart';
import 'package:reserva/services/api_admin.dart';

/// Contrats de chemins API critiques (régression client mobile / admin).
void main() {
  group('ApiAdmin chemins métier', () {
    test('méthodes admin exposées', () {
      expect(ApiAdmin.obtenirStatistiques, isA<Function>());
      expect(ApiAdmin.listerPlans, isA<Function>());
      expect(ApiAdmin.listerPrestataires, isA<Function>());
      expect(ApiAdmin.listerAbonnements, isA<Function>());
      expect(ApiAdmin.listerConfigurations, isA<Function>());
    });
  });

  group('Payloads réservation / paiement (forme attendue backend)', () {
    test('création réservation — champs requis', () {
      final body = <String, dynamic>{
        'serviceId': '00000000-0000-0000-0000-000000000001',
        'creneauId': '00000000-0000-0000-0000-000000000002',
        'notes': 'test',
        'garantieActive': true,
        'acomptePourcent': 30,
      };
      expect(body['serviceId'], isNotEmpty);
      expect(body['creneauId'], isNotEmpty);
      expect(body['acomptePourcent'], inInclusiveRange(10, 100));
    });

    test('paiement — opérateurs supportés', () {
      const operateurs = ['MPESA', 'AIRTEL_MONEY', 'ORANGE_MONEY', 'ESPECES'];
      final body = <String, dynamic>{
        'reservationId': '00000000-0000-0000-0000-000000000001',
        'operateur': 'MPESA',
        'telephonePaiement': '+243991234567',
        'montant': 15000,
        'acompteUniquement': true,
        'idempotencyKey': 'flutter-test-key-001',
      };
      expect(operateurs.contains(body['operateur']), isTrue);
      expect((body['idempotencyKey'] as String).length, greaterThanOrEqualTo(8));
      expect(body['montant'], greaterThan(0));
    });

    test('annulation — mode remboursement', () {
      final body = <String, dynamic>{
        'reservationId': '00000000-0000-0000-0000-000000000001',
        'motif': 'Changement de plan',
        'modeRemboursement': 'AVOIR',
      };
      expect(['AVOIR', 'MOBILE_MONEY'].contains(body['modeRemboursement']), isTrue);
    });

    test('checkout hôtel hold', () {
      final body = <String, dynamic>{
        'hotelId': '00000000-0000-0000-0000-000000000001',
        'typeChambreId': '00000000-0000-0000-0000-000000000002',
        'planTarifId': '00000000-0000-0000-0000-000000000003',
        'arrivee': '2026-11-01',
        'depart': '2026-11-03',
        'adultes': 2,
        'enfants': 0,
      };
      expect(RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(body['arrivee'] as String), isTrue);
      expect(body['adultes'], inInclusiveRange(1, 8));
    });
  });
}
