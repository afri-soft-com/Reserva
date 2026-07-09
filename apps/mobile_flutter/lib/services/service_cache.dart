import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ServiceCache {
  static const _storage = FlutterSecureStorage();
  static const _prefix = 'cache_';
  static const _maxAge = Duration(hours: 1);

  static String _cle(String nom, String? parametres) {
    return '$_prefix${nom}_${parametres ?? ''}';
  }

  static Future<void> mettreEnCache(String nom, dynamic donnees, {String? parametres}) async {
    final cle = _cle(nom, parametres);
    final payload = jsonEncode({
      'timestamp': DateTime.now().toIso8601String(),
      'donnees': donnees,
    });
    await _storage.write(key: cle, value: payload);
  }

  static Future<T?> recupererCache<T>(String nom, {String? parametres}) async {
    final cle = _cle(nom, parametres);
    final raw = await _storage.read(key: cle);
    if (raw == null) return null;
    final payload = jsonDecode(raw) as Map<String, dynamic>;
    final timestamp = DateTime.parse(payload['timestamp'] as String);
    if (DateTime.now().difference(timestamp) > _maxAge) {
      await _storage.delete(key: cle);
      return null;
    }
    return payload['donnees'] as T;
  }

  static Future<void> vider() async {
    final toutes = await _storage.readAll();
    for (final key in toutes.keys.where((k) => k.startsWith(_prefix))) {
      await _storage.delete(key: key);
    }
  }
}
