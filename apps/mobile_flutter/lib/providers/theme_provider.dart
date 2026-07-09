import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ThemeProvider extends ChangeNotifier {
  static const String _cleTheme = 'reserva_theme_mode';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  ThemeMode _mode = ThemeMode.light;
  bool _initialise = false;

  ThemeMode get mode => _mode;
  bool get estSombre => _mode == ThemeMode.dark;
  bool get initialise => _initialise;

  Future<void> initialiser() async {
    final valeur = await _storage.read(key: _cleTheme);
    if (valeur == 'dark') {
      _mode = ThemeMode.dark;
    } else {
      _mode = ThemeMode.light;
    }
    _initialise = true;
    notifyListeners();
  }

  Future<void> basculer() async {
    _mode = _mode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    await _storage.write(key: _cleTheme, value: _mode == ThemeMode.dark ? 'dark' : 'light');
    notifyListeners();
  }

  Future<void> definir(ThemeMode mode) async {
    _mode = mode;
    await _storage.write(key: _cleTheme, value: mode == ThemeMode.dark ? 'dark' : 'light');
    notifyListeners();
  }
}
