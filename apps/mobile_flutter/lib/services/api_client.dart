import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config.dart';

class ApiClient {
  static String get _baseUrl => AppConfig.apiUrl;
  static const String _tokenKey = 'reserva_token';
  static const String _biometrieKey = 'biometrie_activee';
  static final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static Future<String?> getToken() => _storage.read(key: _tokenKey);
  static Future<void> saveToken(String token) => _storage.write(key: _tokenKey, value: token);
  static Future<void> deleteToken() => _storage.delete(key: _tokenKey);

  static Future<String?> getBiometriePref() => _storage.read(key: _biometrieKey);
  static Future<void> saveBiometriePref(String valeur) => _storage.write(key: _biometrieKey, value: valeur);
  static Future<void> deleteBiometriePref() => _storage.delete(key: _biometrieKey);

  static Future<dynamic> request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? params,
    int tentatives = 2,
  }) async {
    for (int i = 0; i < tentatives; i++) {
      try {
        return await _envoyer(method, path, body: body, params: params);
      } catch (e) {
        if (i == tentatives - 1) rethrow;
        if (e is http.ClientException || e.toString().contains('Timeout')) {
          await Future.delayed(Duration(seconds: 1 + i));
          continue;
        }
        rethrow;
      }
    }
    throw Exception('Impossible de contacter le serveur après plusieurs tentatives.');
  }

  static Future<dynamic> _envoyer(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? params,
  }) async {
    final uri = Uri.parse('$_baseUrl$path').replace(queryParameters: params);
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    final token = await getToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }

    http.Response response;
    try {
      switch (method.toUpperCase()) {
        case 'GET':
          response = await http.get(uri, headers: headers).timeout(AppConfig.requeteTimeout);
          break;
        case 'POST':
          response = await http.post(uri, headers: headers, body: body != null ? jsonEncode(body) : null).timeout(AppConfig.requeteTimeout);
          break;
        case 'PATCH':
          response = await http.patch(uri, headers: headers, body: body != null ? jsonEncode(body) : null).timeout(AppConfig.requeteTimeout);
          break;
        case 'DELETE':
          response = await http.delete(uri, headers: headers).timeout(AppConfig.requeteTimeout);
          break;
        default:
          throw Exception('Méthode HTTP non supportée: $method');
      }
    } catch (e) {
      if (e is http.ClientException || e.toString().contains('TimeoutException')) {
        throw Exception('Le serveur ne répond pas. Vérifiez votre connexion internet.');
      }
      rethrow;
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      final erreur = decoded['erreur'] as Map<String, dynamic>?;
      throw Exception(erreur?['message'] as String? ?? 'Une erreur est survenue.');
    }
    final donnees = decoded['donnees'];
    if (donnees is Map<String, dynamic>) return donnees;
    if (donnees is List) return donnees;
    return decoded;
  }

  static Future<dynamic> get(String path, {Map<String, String>? params}) =>
      request('GET', path, params: params);

  /// Récupère une réponse brute (texte) sans décodage JSON — pour les exports CSV
  static Future<String> getTexte(String path, {Map<String, String>? params}) async {
    final uri = Uri.parse('$_baseUrl$path').replace(queryParameters: params);
    final headers = <String, String>{};
    final token = await getToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await http.get(uri, headers: headers).timeout(AppConfig.requeteTimeout);
    if (response.statusCode >= 400) {
      try {
        final decoded = jsonDecode(response.body) as Map<String, dynamic>;
        final erreur = decoded['erreur'] as Map<String, dynamic>?;
        throw Exception(erreur?['message'] as String? ?? 'Une erreur est survenue.');
      } catch (_) {
        throw Exception('Une erreur est survenue lors du téléchargement du rapport.');
      }
    }
    return response.body;
  }

  static Future<dynamic> post(String path, {Map<String, dynamic>? body}) =>
      request('POST', path, body: body);

  static Future<dynamic> patch(String path, {Map<String, dynamic>? body}) =>
      request('PATCH', path, body: body);

  static Future<dynamic> delete(String path) =>
      request('DELETE', path);

  /// Upload multipart (image) vers l'API
  static Future<String> uploadImage(String cheminFichier) async {
    final uri = Uri.parse('$_baseUrl/upload');
    final request = http.MultipartRequest('POST', uri);
    final token = await getToken();
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.files.add(await http.MultipartFile.fromPath('fichier', cheminFichier));
    final streamed = await request.send().timeout(AppConfig.requeteTimeout);
    final response = await http.Response.fromStream(streamed);
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      final erreur = decoded['erreur'] as Map<String, dynamic>?;
      throw Exception(erreur?['message'] as String? ?? 'Erreur upload image.');
    }
    final donnees = decoded['donnees'] as Map<String, dynamic>;
    return donnees['url'] as String;
  }
}
