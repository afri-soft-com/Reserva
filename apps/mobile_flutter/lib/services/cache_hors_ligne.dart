import 'api_client.dart';

/// Cache local simple (JSON dans le stockage sécurisé) pour le mode hors ligne.
/// Permet de consulter les dernières données chargées sans connexion.
class CacheHorsLigne {
  static const _prefixe = 'cache_';

  static Future<void> sauvegarder(String cle, Map<String, dynamic> donnees) async {
    await ApiClient.saveJson('$_prefixe$cle', {
      'sauvegardeLe': DateTime.now().toIso8601String(),
      'donnees': donnees,
    });
  }

  static Future<Map<String, dynamic>?> lire(String cle) async {
    final brut = await ApiClient.readJson('$_prefixe$cle');
    if (brut == null) return null;
    final donnees = brut['donnees'];
    if (donnees is Map<String, dynamic>) return donnees;
    return null;
  }

  static Future<DateTime?> dateSauvegarde(String cle) async {
    final brut = await ApiClient.readJson('$_prefixe$cle');
    if (brut == null) return null;
    return DateTime.tryParse(brut['sauvegardeLe'] as String? ?? '');
  }

  static String formaterDate(DateTime date) {
    final h = date.hour.toString().padLeft(2, '0');
    final m = date.minute.toString().padLeft(2, '0');
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')} à $h:$m';
  }
}
