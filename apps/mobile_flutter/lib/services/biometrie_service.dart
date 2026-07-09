import 'package:local_auth/local_auth.dart';

class ServiceBiometrie {
  static final LocalAuthentication _auth = LocalAuthentication();

  static Future<bool> estDisponible() async {
    try {
      return await _auth.canCheckBiometrics || await _auth.isDeviceSupported();
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
        ),
      );
    } catch (_) {
      return false;
    }
  }
}
