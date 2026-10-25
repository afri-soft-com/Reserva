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
  bool get estAgent => _utilisateur?.role == RoleUtilisateur.agent;
  bool get estClientOuAgent =>
      _utilisateur?.role == RoleUtilisateur.client || _utilisateur?.role == RoleUtilisateur.agent;
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

  /// Retourne un message d'erreur utilisateur, ou null si OK.
  Future<String?> basculerBiometrie() async {
    if (!_biometrieDisponible) {
      return 'Biométrie non disponible sur cet appareil';
    }
    if (_biometrieActivee) {
      _biometrieActivee = false;
      await ApiClient.saveBiometriePref('non');
      notifyListeners();
      return null;
    }
    final ok = await ServiceBiometrie.authentifier();
    if (!ok) {
      return 'Authentification biométrique annulée ou échouée';
    }
    _biometrieActivee = true;
    await ApiClient.saveBiometriePref('oui');
    notifyListeners();
    return null;
  }

  Future<void> connecterStore(String token, Utilisateur utilisateur, {Prestataire? prestataire}) async {
    await ApiClient.saveToken(token);
    if (utilisateur.telephone.trim().isNotEmpty) {
      await ApiClient.saveDernierTelephone(utilisateur.telephone);
    }
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
    if (actif && _utilisateur != null && !_utilisateur!.telephoneVerifie) {
      throw Exception('Vérifiez votre numéro de téléphone avant d\'activer la 2FA.');
    }
    final data = await ApiAuth.definir2FA(actif);
    final raw = data['utilisateur'];
    if (raw is Map<String, dynamic>) {
      _utilisateur = Utilisateur.fromJson(raw);
    } else if (raw is Map) {
      _utilisateur = Utilisateur.fromJson(Map<String, dynamic>.from(raw));
    } else if (_utilisateur != null) {
      // Fallback si la forme de réponse change : maj locale du flag.
      final u = _utilisateur!;
      _utilisateur = Utilisateur(
        id: u.id,
        telephone: u.telephone,
        email: u.email,
        nom: u.nom,
        role: u.role,
        langue: u.langue,
        photoUrl: u.photoUrl,
        telephoneVerifie: u.telephoneVerifie,
        deuxFAActif: actif,
        creeLe: u.creeLe,
      );
    }
    notifyListeners();
  }

  Future<void> deconnecter() async {
    // Conserve dernier téléphone + préférence biométrie pour l'écran PIN.
    if (_utilisateur?.telephone != null && _utilisateur!.telephone.trim().isNotEmpty) {
      await ApiClient.saveDernierTelephone(_utilisateur!.telephone);
    }
    await ApiClient.deleteToken();
    await ServiceCache.vider();
    await CacheHorsLigne.vider();
    SocketService().deconnecter();
    _utilisateur = null;
    _prestataire = null;
    _estConnecte = false;
    notifyListeners();
  }
}
