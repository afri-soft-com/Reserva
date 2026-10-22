import 'dart:convert';
import 'dart:typed_data';
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

  /// Stocke une structure JSON localement (cache hors ligne)
  static Future<void> saveJson(String cle, Map<String, dynamic> donnees) =>
      _storage.write(key: cle, value: jsonEncode(donnees));

  /// Supprime une entrée locale du stockage sécurisé
  static Future<void> deleteFromStorage(String cle) => _storage.delete(key: cle);

  /// Lit une structure JSON stockée localement (ou null si absente)
  static Future<Map<String, dynamic>?> readJson(String cle) async {
    final brut = await _storage.read(key: cle);
    if (brut == null) return null;
    try {
      final decoded = jsonDecode(brut);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {
      return null;
    }
    return null;
  }

  /// Erreur transitoire (HTML Render / 5xx) — le client peut réessayer.
  static bool _estErreurRetriable(Object e) {
    final m = e.toString().toLowerCase();
    return e is http.ClientException ||
        m.contains('timeout') ||
        m.contains('momentanément indisponible') ||
        m.contains('momentanement indisponible') ||
        m.contains('réessayez') ||
        m.contains('reessayez');
  }

  static Future<dynamic> request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? params,
    int tentatives = 3,
  }) async {
    for (int i = 0; i < tentatives; i++) {
      try {
        return await _envoyer(method, path, body: body, params: params);
      } catch (e) {
        if (i == tentatives - 1) rethrow;
        if (_estErreurRetriable(e)) {
          await Future.delayed(Duration(seconds: 1 + i));
          continue;
        }
        rethrow;
      }
    }
    throw Exception('Impossible de contacter le serveur après plusieurs tentatives.');
  }

  /// Décode JSON API ; refuse les pages HTML (502 Render, mauvaise API_URL, etc.).
  static Map<String, dynamic> _decoderJsonApi(http.Response response) {
    final brut = response.body;
    final trim = brut.trimLeft();
    final ct = (response.headers['content-type'] ?? '').toLowerCase();
    final estHtml = trim.startsWith('<!DOCTYPE') ||
        trim.startsWith('<!doctype') ||
        trim.startsWith('<html') ||
        (ct.contains('text/html') && !ct.contains('json'));

    if (estHtml || trim.isEmpty) {
      if (response.statusCode >= 500 || response.statusCode == 429) {
        throw Exception('Le serveur est momentanément indisponible. Réessayez dans une minute.');
      }
      throw Exception(
        'Réponse invalide du serveur (page HTML au lieu de JSON). '
        'Vérifiez votre connexion ou réessayez après une mise à jour.',
      );
    }

    try {
      final decoded = jsonDecode(brut);
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
      throw Exception('Réponse serveur inattendue.');
    } on FormatException {
      throw Exception('Réponse serveur illisible. Réessayez dans une minute.');
    }
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
        case 'PUT':
          response = await http.put(uri, headers: headers, body: body != null ? jsonEncode(body) : null).timeout(AppConfig.requeteTimeout);
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

    // 5xx HTML (cold start / redeploy Render) → message clair + retry via request().
    if (response.statusCode >= 500) {
      final trim = response.body.trimLeft();
      if (trim.startsWith('<!') || trim.startsWith('<html')) {
        throw Exception('Le serveur est momentanément indisponible. Réessayez dans une minute.');
      }
    }

    final decoded = _decoderJsonApi(response);
    if (response.statusCode >= 400) {
      final erreur = decoded['erreur'];
      final message = erreur is Map ? erreur['message'] as String? : null;
      throw Exception(message ?? 'Une erreur est survenue.');
    }
    final donnees = decoded['donnees'];
    // jsonDecode peut renvoyer Map<dynamic,dynamic> selon la plateforme — normaliser.
    if (donnees is Map) return Map<String, dynamic>.from(donnees);
    if (donnees is List) return donnees;
    return decoded;
  }

  static Future<dynamic> get(String path, {Map<String, String>? params}) =>
      request('GET', path, params: params);

  /// Récupère une réponse brute (texte) sans décodage JSON — pour les exports CSV
  static Future<String> getTexte(String path, {Map<String, String>? params}) async {    final uri = Uri.parse('$_baseUrl$path').replace(queryParameters: params);
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

  /// Récupère des octets bruts (fichiers binaires, PDF) sans décodage JSON
  static Future<Uint8List> getOctets(String path, {Map<String, String>? params}) async {
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
        throw Exception('Une erreur est survenue lors du téléchargement du document.');
      }
    }
    return response.bodyBytes;
  }

  static Future<dynamic> post(String path, {Map<String, dynamic>? body}) =>
      request('POST', path, body: body);

  static Future<dynamic> patch(String path, {Map<String, dynamic>? body}) =>
      request('PATCH', path, body: body);

  static Future<dynamic> put(String path, {Map<String, dynamic>? body}) =>
      request('PUT', path, body: body);

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
    final streamed = await request.send().timeout(const Duration(seconds: 60));
    final response = await http.Response.fromStream(streamed);
    Map<String, dynamic> decoded;
    try {
      decoded = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      throw Exception(
        response.statusCode >= 400
            ? 'Échec upload (${response.statusCode}). Vérifiez la connexion.'
            : 'Réponse serveur invalide lors de l\'upload.',
      );
    }
    if (response.statusCode >= 400) {
      final erreur = decoded['erreur'] as Map<String, dynamic>?;
      throw Exception(erreur?['message'] as String? ?? 'Erreur upload image.');
    }
    final donnees = decoded['donnees'] as Map<String, dynamic>?;
    final url = donnees?['url'] as String?;
    if (url == null || url.isEmpty) {
      throw Exception('URL de fichier manquante après upload.');
    }
    return url;
  }
}
