import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../services/api_auth.dart';
import '../services/jwt_decoder.dart';
import '../services/biometrie_service.dart';
import '../services/service_cache.dart';
import '../services/cache_hors_ligne.dart';
import '../services/socket_service.dart';

class AuthProvider extends ChangeNotifier {
  Utilisateur? _utilisateur;
  Prestataire? _prestataire;
  bool _chargementInitial = true;
  bool _estConnecte = false;
  String? _erreur;
  bool _biometrieDisponible = false;
  bool _biometrieActivee = false;
  bool _demandeBiometrieEnCours = false;

  Utilisateur? get utilisateur => _utilisateur;
  Prestataire? get prestataire => _prestataire;
  bool get chargementInitial => _chargementInitial;
  bool get estConnecte => _estConnecte;
  String? get erreur => _erreur;
  bool get estPrestataire => _utilisateur?.role == RoleUtilisateur.prestataire;
  bool get estAdmin => _utilisateur?.role == RoleUtilisateur.admin;
  bool get biometrieDisponible => _biometrieDisponible;
  bool get biometrieActivee => _biometrieActivee;
  bool get demandeBiometrieEnCours => _demandeBiometrieEnCours;

  Future<void> initialiser() async {
    _chargementInitial = true;
    notifyListeners();

    _biometrieDisponible = await ServiceBiometrie.estDisponible();
    if (_biometrieDisponible) {
      final pref = await ApiClient.getBiometriePref();
      _biometrieActivee = pref == 'oui';
    }

    final token = await ApiClient.getToken();
    if (token == null || JwtDecoder.estExpire(token)) {
      if (token != null) await ApiClient.deleteToken();
      await ServiceCache.vider();
      await CacheHorsLigne.vider();
      _chargementInitial = false;
      notifyListeners();
      return;
    }

    try {
      final data = await ApiAuth.obtenirProfil();
      _utilisateur = Utilisateur.fromJson(data);
      if (data['prestataire'] != null) {
        _prestataire = Prestataire.fromJson(data['prestataire'] as Map<String, dynamic>);
      }
      _estConnecte = true;
    } catch (e) {
      await ApiClient.deleteToken();
    }

    _chargementInitial = false;
    notifyListeners();
  }

  Future<bool> authentifierParBiometrie() async {
    if (!_biometrieDisponible) return false;
    _demandeBiometrieEnCours = true;
    notifyListeners();
    final ok = await ServiceBiometrie.authentifier();
    _demandeBiometrieEnCours = false;
    notifyListeners();
    return ok;
  }

  Future<void> basculerBiometrie() async {
    if (!_biometrieDisponible) return;
    if (_biometrieActivee) {
      _biometrieActivee = false;
      await ApiClient.saveBiometriePref('non');
    } else {
      final ok = await ServiceBiometrie.authentifier();
      if (ok) {
        _biometrieActivee = true;
        await ApiClient.saveBiometriePref('oui');
      }
    }
    notifyListeners();
  }

  Future<void> connecterStore(String token, Utilisateur utilisateur, {Prestataire? prestataire}) async {
    await ApiClient.saveToken(token);
    _utilisateur = utilisateur;
    _prestataire = prestataire;
    _estConnecte = true;
    _erreur = null;
    SocketService().connecter();
    notifyListeners();
  }

  Future<void> mettreAJourProfil({String? nom, String? email, String? langue}) async {
    try {
      final data = await ApiAuth.modifierProfil(nom: nom, email: email, langue: langue);
      _utilisateur = Utilisateur.fromJson(data['utilisateur'] as Map<String, dynamic>);
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> definir2FA(bool actif) async {
    final data = await ApiAuth.definir2FA(actif);
    _utilisateur = Utilisateur.fromJson(data['utilisateur'] as Map<String, dynamic>);
    notifyListeners();
  }

  Future<void> deconnecter() async {
    await ApiClient.deleteToken();
    await ApiClient.deleteBiometriePref();
    await ServiceCache.vider();
    await CacheHorsLigne.vider();
    SocketService().deconnecter();
    _utilisateur = null;
    _prestataire = null;
    _estConnecte = false;
    _biometrieActivee = false;
    notifyListeners();
  }
}
