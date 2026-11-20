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
    expect(Creneau.fromJson(json).ressourcesLibres, isNull);
    expect(Creneau.fromJson({...json, 'ressourcesLibres': ['dr-a', 'dr-b']}).ressourcesLibres, ['dr-a', 'dr-b']);
  });

  group('UniteRessource — vocabulaire selon la catégorie', () {
    test('libellé par catégorie', () {
      expect(UniteRessource.pour(CategorieService.restauration).singulier, 'Table');
      expect(UniteRessource.pour(CategorieService.salleReunion).pluriel, 'Salles');
      expect(UniteRessource.pour(CategorieService.sante).singulier, 'Praticien');
      expect(UniteRessource.pour(CategorieService.sante).capaciteDefaut, 1);
      expect(UniteRessource.pour('INCONNUE').singulier, 'Ressource');
      expect(UniteRessource.pour(null).singulier, 'Ressource');
    });

    test('le libellé personnalisé l\'emporte et garde l\'icône de la catégorie', () {
      final u = UniteRessource.pour(CategorieService.sante, ' Cabinet ');
      expect(u.singulier, 'Cabinet');
      expect(u.pluriel, 'Cabinets');
      expect(u.icone, UniteRessource.pour(CategorieService.sante).icone);
      expect(UniteRessource.pour(null, 'Box').pluriel, 'Box');
      expect(UniteRessource.pour(CategorieService.sante, '').singulier, 'Praticien');
    });

    test('ServiceOffert lit choixRessource et libelleRessource', () {
      final s = ServiceOffert.fromJson({
        'id': 's1', 'prestataireId': 'p1', 'nom': 'Consultation', 'prix': 20, 'devise': 'USD',
        'modeReservation': 'TABLE', 'choixRessource': true, 'libelleRessource': 'Praticien',
      });
      expect(s.choixRessource, isTrue);
      expect(s.unite(CategorieService.sante).minuscule, 'praticien');
    });
  });
}
