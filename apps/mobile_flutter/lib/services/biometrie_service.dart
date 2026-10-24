import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';

class ServiceBiometrie {
  static final LocalAuthentication _auth = LocalAuthentication();

  static Future<bool> estDisponible() async {
    try {
      final support = await _auth.isDeviceSupported();
      if (!support) return false;
      final can = await _auth.canCheckBiometrics;
      if (can) return true;
      // PIN / schéma appareil comme repli (biometricOnly: false à l'auth).
      return support;
    } catch (_) {
      return false;
    }
  }

  static Future<List<BiometricType>> obtenirTypes() async {
    try {
      return await _auth.getAvailableBiometrics();
    } catch (_) {
      return [];
    }
  }

  static Future<bool> authentifier() async {
    try {
      return await _auth.authenticate(
        localizedReason: 'Déverrouillez RESERVA pour continuer',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false,
          useErrorDialogs: true,
        ),
      );
    } on PlatformException {
      return false;
    } catch (_) {
      return false;
    }
  }
}
