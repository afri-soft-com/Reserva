import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../i18n.dart';

class LangueProvider extends ChangeNotifier {
  static const String _cleLangue = 'reserva_langue';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  String _langue = 'fr';
  bool _initialise = false;

  String get langue => _langue;
  bool get initialise => _initialise;

  Future<void> initialiser() async {
    final valeur = await _storage.read(key: _cleLangue);
    if (valeur == 'ln' || valeur == 'sw') {
      _langue = valeur!;
    }
    _initialise = true;
    AppTraductions.definirLangue(_langue);
    notifyListeners();
  }
  Future<void> definir(String langue) async {
    if (langue != 'fr' && langue != 'ln' && langue != 'sw') return;
    _langue = langue;
    AppTraductions.definirLangue(langue);
    await _storage.write(key: _cleLangue, value: langue);
    notifyListeners();
  }
}
