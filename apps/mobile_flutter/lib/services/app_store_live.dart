import 'dart:convert';
import 'package:http/http.dart' as http;

/// Version actuellement téléchargeable sur l'App Store (API publique iTunes lookup).
///
/// Sert à ne pas afficher une bannière « Mettre à jour » tant qu'Apple n'a pas
/// validé la build : la CI publie le seuil dès l'envoi, la revue prend des heures.
class AppStoreLive {
  static const Duration _cache = Duration(minutes: 30);
  static String? _bundleCache;
  static String? _versionCache;
  static DateTime? _luLe;

  /// `null` = inconnu (réseau, app absente du store du pays…) : l'appelant
  /// garde alors le comportement normal plutôt que de masquer la bannière.
  static Future<String?> version(String bundleId) async {
    final maintenant = DateTime.now();
    if (_bundleCache == bundleId && _luLe != null && maintenant.difference(_luLe!) < _cache) {
      return _versionCache;
    }
    String? trouvee;
    // Store congolais d'abord, puis le store par défaut.
    for (final pays in const ['cd', '']) {
      trouvee = await _lire(bundleId, pays);
      if (trouvee != null) break;
    }
    _bundleCache = bundleId;
    _versionCache = trouvee;
    _luLe = maintenant;
    return trouvee;
  }

  static Future<String?> _lire(String bundleId, String pays) async {
    try {
      final uri = Uri.https('itunes.apple.com', '/lookup', {
        'bundleId': bundleId,
        if (pays.isNotEmpty) 'country': pays,
        // Contourne le cache CDN d'Apple, souvent en retard après une sortie.
        't': '${DateTime.now().millisecondsSinceEpoch ~/ 60000}',
      });
      final res = await http.get(uri).timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      final data = jsonDecode(res.body);
      if (data is! Map || data['results'] is! List) return null;
      final resultats = data['results'] as List;
      if (resultats.isEmpty || resultats.first is! Map) return null;
      final version = (resultats.first as Map)['version']?.toString().trim();
      return version == null || version.isEmpty ? null : version;
    } catch (_) {
      return null;
    }
  }
}
