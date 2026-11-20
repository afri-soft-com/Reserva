import 'package:flutter_test/flutter_test.dart';
import 'package:reserva/models/models.dart';

void main() {
  group('ServiceOffert — mode TABLE et prix par personne', () {
    final base = {
      'id': 's1',
      'prestataireId': 'p1',
      'nom': 'Dîner',
      'prix': 15.0,
      'devise': 'USD',
    };

    test('défauts pour un service classique', () {
      final s = ServiceOffert.fromJson(base);
      expect(s.estModeTable, isFalse);
      expect(s.demandeNombrePersonnes, isFalse);
      expect(s.prixPour(4), 15.0);
    });

    test('restaurant avec prix par personne', () {
      final s = ServiceOffert.fromJson({...base, 'modeReservation': 'TABLE', 'prixParPersonne': true});
      expect(s.estModeTable, isTrue);
      expect(s.demandeNombrePersonnes, isTrue);
      expect(s.prixPour(4), 60.0);
      expect(s.prixPour(0), 15.0);
    });
  });

  test('Creneau lit personnesMax (mode TABLE uniquement)', () {
    final json = {'id': 'c1', 'serviceId': 's1', 'debut': '2030-01-01T19:00:00.000Z', 'fin': '2030-01-01T21:00:00.000Z'};
    expect(Creneau.fromJson(json).personnesMax, isNull);
    expect(Creneau.fromJson({...json, 'personnesMax': 6}).personnesMax, 6);
  });
}
