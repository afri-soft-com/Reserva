import 'package:flutter_test/flutter_test.dart';
import 'package:reserva/app_flavor.dart';

void main() {
  setUp(() {
    AppFlavorConfig.initialiser(AppFlavor.prestataire);
  });

  test('AppFlavor Pro expose le bon rôle et nom', () {
    expect(AppFlavorConfig.estPrestataire, isTrue);
    expect(AppFlavorConfig.estClient, isFalse);
    expect(AppFlavorConfig.nomApp, 'RESERVA Pro');
    expect(AppFlavorConfig.roleApi, 'PRESTATAIRE');
    expect(AppFlavorConfig.roleCompatible('PRESTATAIRE'), isTrue);
    expect(AppFlavorConfig.roleCompatible('CLIENT'), isFalse);
    expect(AppFlavorConfig.sousTitreBienvenue.toLowerCase(), contains('prestataire'));
  });

  test('AppFlavor Client distinct de Pro', () {
    AppFlavorConfig.initialiser(AppFlavor.client);
    expect(AppFlavorConfig.nomApp, 'RESERVA');
    expect(AppFlavorConfig.roleApi, 'CLIENT');
    expect(AppFlavorConfig.roleCompatible('CLIENT'), isTrue);
    expect(AppFlavorConfig.roleCompatible('PRESTATAIRE'), isFalse);
  });
}
