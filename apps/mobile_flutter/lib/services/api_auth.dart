import 'api_client.dart';

class ApiAuth {
  static Future<Map<String, dynamic>> inscrire(String telephone, String nom) async {
    return (await ApiClient.post('/auth/inscription', body: {
      'telephone': telephone,
      'nom': nom,
      'langue': 'fr',
    })) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> renvoyerOtp(String telephone) async {
    return (await ApiClient.post('/auth/otp/renvoyer', body: {'telephone': telephone})) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> verifierOtp(String telephone, String code) async {
    return (await ApiClient.post('/auth/otp/verifier', body: {'telephone': telephone, 'code': code})) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> definirPin(String telephone, String pin) async {
    return (await ApiClient.post('/auth/pin/definir', body: {'telephone': telephone, 'pin': pin})) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> connecter(String telephone, String pin) async {
    return (await ApiClient.post('/auth/connexion', body: {'telephone': telephone, 'pin': pin})) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> verifier2FA(String telephone, String code) async {
    return (await ApiClient.post('/auth/2fa/verifier', body: {'telephone': telephone, 'code': code})) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> obtenirProfil() async {
    return (await ApiClient.get('/auth/profil')) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> demanderReinitialisationPin(String telephone) async {
    return (await ApiClient.post('/auth/pin/reinitialiser/demander', body: {'telephone': telephone})) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> reinitialiserPin(String telephone, String code, String nouveauPin) async {
    return (await ApiClient.post('/auth/pin/reinitialiser/confirmer', body: {
      'telephone': telephone,
      'code': code,
      'nouveauPin': nouveauPin,
    })) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> modifierProfil({String? nom, String? email, String? langue}) async {
    final body = <String, dynamic>{};
    if (nom != null) body['nom'] = nom;
    if (email != null) body['email'] = email;
    if (langue != null) body['langue'] = langue;
    return (await ApiClient.patch('/auth/profil', body: body)) as Map<String, dynamic>;
  }
}
