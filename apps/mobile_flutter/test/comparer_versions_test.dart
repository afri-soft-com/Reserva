import 'package:flutter_test/flutter_test.dart';
import 'package:reserva/utils/comparer_versions.dart';

void main() {
  group('comparerVersions', () {
    test('ordre semver', () {
      expect(comparerVersions('1.0.0', '1.0.1'), lessThan(0));
      expect(comparerVersions('1.0.1', '1.0.0'), greaterThan(0));
      expect(comparerVersions('1.0.1', '1.0.1'), 0);
      expect(comparerVersions('1.2.0', '1.10.0'), lessThan(0));
    });
  });

  group('decideModeMiseAJour', () {
    test('none quand à jour', () {
      expect(
        decideModeMiseAJour(
          versionInstallee: '1.0.1',
          minSoft: '1.0.0',
          minForce: '0.9.0',
        ),
        'none',
      );
    });

    test('soft quand sous minSoft', () {
      expect(
        decideModeMiseAJour(
          versionInstallee: '1.0.0',
          minSoft: '1.0.2',
          minForce: '0.9.0',
        ),
        'soft',
      );
    });

    test('force prioritaire sur soft', () {
      expect(
        decideModeMiseAJour(
          versionInstallee: '1.0.0',
          minSoft: '1.0.2',
          minForce: '1.0.1',
        ),
        'force',
      );
    });

    test('disparition après MAJ (none)', () {
      expect(
        decideModeMiseAJour(
          versionInstallee: '1.0.2',
          minSoft: '1.0.2',
          minForce: '1.0.0',
        ),
        'none',
      );
    });
  });
}
