import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Sons d'alerte distinctifs Reserva (nouvelles réservations Pro).
enum SonAlerteReserva {
  sirene,
  impulsion,
  balise;

  String get id {
    switch (this) {
      case SonAlerteReserva.sirene:
        return 'sirene';
      case SonAlerteReserva.impulsion:
        return 'impulsion';
      case SonAlerteReserva.balise:
        return 'balise';
    }
  }

  String get titre {
    switch (this) {
      case SonAlerteReserva.sirene:
        return 'Sirène Reserva';
      case SonAlerteReserva.impulsion:
        return 'Impulsion Reserva';
      case SonAlerteReserva.balise:
        return 'Balise Reserva';
    }
  }

  String get description {
    switch (this) {
      case SonAlerteReserva.sirene:
        return 'Double tonalité urgente — recommandé pour les nouvelles résas';
      case SonAlerteReserva.impulsion:
        return 'Série de bips rythmés, reconnaissable immédiatement';
      case SonAlerteReserva.balise:
        return 'Motif musical Reserva (plus doux, toujours distinct)';
    }
  }

  String get assetPath {
    switch (this) {
      case SonAlerteReserva.sirene:
        return 'sounds/sirene_reserva.wav';
      case SonAlerteReserva.impulsion:
        return 'sounds/impulsion_reserva.wav';
      case SonAlerteReserva.balise:
        return 'sounds/balise_reserva.wav';
    }
  }

  static SonAlerteReserva depuisId(String? id) {
    return SonAlerteReserva.values.firstWhere(
      (s) => s.id == id,
      orElse: () => SonAlerteReserva.impulsion,
    );
  }
}

class SonAlerteService {
  static const _cleSon = 'reserva_son_alerte_resa';
  static const _cleActif = 'reserva_son_alerte_actif';
  static const _storage = FlutterSecureStorage();
  static final AudioPlayer _player = AudioPlayer();

  static SonAlerteReserva _son = SonAlerteReserva.impulsion;
  static bool _actif = true;
  static bool _pret = false;

  static SonAlerteReserva get sonCourant => _son;
  static bool get actif => _actif;

  static Future<void> initialiser() async {
    if (_pret) return;
    final id = await _storage.read(key: _cleSon);
    final actifStr = await _storage.read(key: _cleActif);
    _son = SonAlerteReserva.depuisId(id);
    _actif = actifStr != '0';
    await _player.setReleaseMode(ReleaseMode.stop);
    _pret = true;
  }

  static Future<void> definirSon(SonAlerteReserva son) async {
    _son = son;
    await _storage.write(key: _cleSon, value: son.id);
  }

  static Future<void> definirActif(bool valeur) async {
    _actif = valeur;
    await _storage.write(key: _cleActif, value: valeur ? '1' : '0');
  }

  /// Joue le son choisi (ignore [actif] si [forcer] — pour le bouton Tester).
  static Future<void> jouer({bool forcer = false}) async {
    await initialiser();
    if (!forcer && !_actif) return;
    try {
      await _player.stop();
      await _player.play(AssetSource(_son.assetPath));
    } catch (_) {
      /* asset / plateforme */
    }
  }

  static Future<void> arreter() async {
    try {
      await _player.stop();
    } catch (_) {}
  }
}
