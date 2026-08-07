import 'dart:typed_data';
import 'api_client.dart';
import 'cache_hors_ligne.dart';
import '../models/models.dart';

class DashboardStats {
  final int totalReservationsSemaine;
  final int totalReservationsMois;
  final double revenusMoisEnCours;
  final int reservationsEnAttenteAction;
  final double noteMoyenne;
  final int nombreAvis;
  final double tauxOccupation;
  final double revenusAnnuels;
  final double evolutionMoisPrecedent;
  final int meilleurMois;
  final List<EvolutionMensuelle> evolutionMensuelle;

  DashboardStats({
    required this.totalReservationsSemaine,
    required this.totalReservationsMois,
    required this.revenusMoisEnCours,
    required this.reservationsEnAttenteAction,
    required this.noteMoyenne,
    required this.nombreAvis,
    this.tauxOccupation = 0,
    this.revenusAnnuels = 0,
    this.evolutionMoisPrecedent = 0,
    this.meilleurMois = 0,
    this.evolutionMensuelle = const [],
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) => DashboardStats(
    totalReservationsSemaine: json['totalReservationsSemaine'] as int? ?? 0,
    totalReservationsMois: json['totalReservationsMois'] as int? ?? 0,
    revenusMoisEnCours: (json['revenusMoisEnCours'] as num?)?.toDouble() ?? 0.0,
    reservationsEnAttenteAction: json['reservationsEnAttenteAction'] as int? ?? 0,
    noteMoyenne: (json['noteMoyenne'] as num?)?.toDouble() ?? 0.0,
    nombreAvis: json['nombreAvis'] as int? ?? 0,
    tauxOccupation: (json['tauxOccupation'] as num?)?.toDouble() ?? 0.0,
    revenusAnnuels: (json['revenusAnnuels'] as num?)?.toDouble() ?? 0.0,
    evolutionMoisPrecedent: (json['evolutionMoisPrecedent'] as num?)?.toDouble() ?? 0.0,
    meilleurMois: json['meilleurMois'] as int? ?? 0,
    evolutionMensuelle: (json['evolutionMensuelle'] as List<dynamic>? ?? []).map((e) =>
      EvolutionMensuelle.fromJson(e as Map<String, dynamic>)).toList(),
  );
}

class EvolutionMensuelle {
  final String mois;
  final double revenus;
  final int reservations;

  EvolutionMensuelle({required this.mois, required this.revenus, required this.reservations});

  factory EvolutionMensuelle.fromJson(Map<String, dynamic> json) => EvolutionMensuelle(
    mois: json['mois'] as String? ?? '',
    revenus: (json['revenus'] as num?)?.toDouble() ?? 0.0,
    reservations: json['reservations'] as int? ?? 0,
  );
}

class ServicePopulaire {
  final String serviceId;
  final String nom;
  final int reservations;
  final double revenus;

  ServicePopulaire({required this.serviceId, required this.nom, required this.reservations, required this.revenus});

  factory ServicePopulaire.fromJson(Map<String, dynamic> json) => ServicePopulaire(
    serviceId: json['serviceId'] as String? ?? '',
    nom: json['nom'] as String? ?? '',
    reservations: json['reservations'] as int? ?? 0,
    revenus: (json['revenus'] as num?)?.toDouble() ?? 0.0,
  );
}

class RepartitionStatut {
  final String statut;
  final int count;

  RepartitionStatut({required this.statut, required this.count});
}

class DashboardData {
  final List<ReservationDetaillee> reservationsAujourdhui;
  final List<ReservationDetaillee> prochainesReservations;
  final DashboardStats statistiques;
  final List<ServicePopulaire> servicesPopulaires;
  final List<RepartitionStatut> parStatut;

  DashboardData({
    required this.reservationsAujourdhui,
    required this.statistiques,
    this.prochainesReservations = const [],
    this.servicesPopulaires = const [],
    this.parStatut = const [],
  });
}

class AvisRecu {
  final String id;
  final int note;
  final String? commentaire;
  final String? reponsePrestataire;
  final String creeLe;
  final String clientNom;
  final String? clientPhotoUrl;

  AvisRecu({
    required this.id,
    required this.note,
    this.commentaire,
    this.reponsePrestataire,
    required this.creeLe,
    required this.clientNom,
    this.clientPhotoUrl,
  });

  factory AvisRecu.fromJson(Map<String, dynamic> json) => AvisRecu(
    id: json['id'] as String,
    note: json['note'] as int? ?? 5,
    commentaire: json['commentaire'] as String?,
    reponsePrestataire: json['reponsePrestataire'] as String?,
    creeLe: json['creeLe'] as String,
    clientNom: json['client'] is Map ? (json['client']['nom'] as String? ?? 'Client') : 'Client',
    clientPhotoUrl: json['client'] is Map ? json['client']['photoUrl'] as String? : null,
  );
}

class AvisRecusData {
  final List<AvisRecu> avis;
  final double noteMoyenne;
  final int nombreAvis;
  final Map<int, int> repartition;

  AvisRecusData({
    required this.avis,
    required this.noteMoyenne,
    required this.nombreAvis,
    required this.repartition,
  });
}

class ApiPrestataire {
  static bool horsLigne = false;
  static DateTime? cacheSauvegardeLe;

  static Future<DashboardData> obtenirTableauDeBord() async {
    late final Map<String, dynamic> data;
    try {
      data = (await ApiClient.get('/prestataires/moi/tableau-de-bord')) as Map<String, dynamic>;
      await CacheHorsLigne.sauvegarder('dashboard_prestataire', {'data': data});
      horsLigne = false;
    } catch (_) {
      final cache = await CacheHorsLigne.lire('dashboard_prestataire');
      if (cache == null || cache['data'] is! Map<String, dynamic>) rethrow;
      horsLigne = true;
      cacheSauvegardeLe = await CacheHorsLigne.dateSauvegarde('dashboard_prestataire');
      data = cache['data'] as Map<String, dynamic>;
    }
    final aujourdhui = _parserReservationListe(data['reservationsAujourdhui']);
    final prochaines = _parserReservationListe(data['prochainesReservations']);
    final stats = DashboardStats.fromJson(data['statistiques'] as Map<String, dynamic>? ?? {});
    final servicesPopulaires = (data['servicesPopulaires'] as List<dynamic>? ?? []).map((e) =>
      ServicePopulaire.fromJson(e as Map<String, dynamic>)).toList();
    final parStatut = (data['parStatut'] as List<dynamic>? ?? []).map((e) {
      final m = e as Map<String, dynamic>;
      return RepartitionStatut(statut: m['statut'] as String? ?? '', count: (m['_count'] as int?) ?? 0);
    }).toList();
    return DashboardData(
      reservationsAujourdhui: aujourdhui,
      prochainesReservations: prochaines,
      statistiques: stats,
      servicesPopulaires: servicesPopulaires,
      parStatut: parStatut,
    );
  }

  static List<ReservationDetaillee> _parserReservationListe(dynamic brut) {
    return (brut as List<dynamic>? ?? []).map((e) {
      final r = e as Map<String, dynamic>;
      final service = ServiceOffert.fromJson(r['service'] as Map<String, dynamic>? ?? {});
      final client = r['client'] as Map<String, dynamic>? ?? {};
      final creneau = Creneau.fromJson(r['creneau'] as Map<String, dynamic>? ?? {});
      final reservation = Reservation.fromJson(r);
      return ReservationDetaillee(
        reservation: reservation,
        service: service,
        prestataire: Prestataire.fromJson({
          'id': '', 'utilisateurId': r['clientId'] as String? ?? '',
          'nomEntreprise': client['nom'] ?? '', 'categorie': '',
          'ville': '', 'quartier': '', 'statut': 'APPROUVE',
          'noteMoyenne': 0, 'nombreAvis': 0,
          'delaiAnnulationGratuiteHeures': 24, 'fraisAnnulationTardivePourcent': 50,
          'creeLe': DateTime.now().toIso8601String(),
        }),
        creneau: creneau,
      );
    }).toList();
  }

  static Future<Map<String, dynamic>> obtenirProfil() async {
    return (await ApiClient.get('/prestataires/moi')) as Map<String, dynamic>;
  }

  static Future<List<dynamic>> listerMesServices() async {
    final data = await ApiClient.get('/prestataires/moi/services');
    if (data is List) return data;
    if (data is Map && data.containsKey('services')) return data['services'] as List<dynamic>? ?? [];
    return [];
  }

  static Future<Map<String, dynamic>> creerService(Map<String, dynamic> body) async {
    return (await ApiClient.post('/prestataires/moi/services', body: body)) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> modifierService(String serviceId, Map<String, dynamic> body) async {
    return (await ApiClient.patch('/prestataires/moi/services/$serviceId', body: body)) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> creerCreneau(Map<String, dynamic> body) async {
    return (await ApiClient.post('/services/creneaux', body: body)) as Map<String, dynamic>;
  }

  static Future<void> supprimerCreneau(String creneauId) async {
    await ApiClient.request('DELETE', '/services/creneaux/$creneauId');
  }

  static Future<List<dynamic>> listerCreneauxService(String serviceId) async {
    final data = await ApiClient.get('/services/$serviceId/creneaux/gestion');
    if (data is List) return data;
    return [];
  }

  static Future<AvisRecusData> obtenirAvisRecus() async {
    final data = await ApiClient.get('/avis/recus');
    final avisList = (data['avis'] as List<dynamic>? ?? []).map((e) => AvisRecu.fromJson(e as Map<String, dynamic>)).toList();
    final repartitionRaw = data['repartition'] as Map<String, dynamic>? ?? {};
    final repartition = <int, int>{};
    repartitionRaw.forEach((k, v) => repartition[int.parse(k)] = (v as int?) ?? 0);
    return AvisRecusData(
      avis: avisList,
      noteMoyenne: (data['noteMoyenne'] as num?)?.toDouble() ?? 0.0,
      nombreAvis: data['nombreAvis'] as int? ?? 0,
      repartition: repartition,
    );
  }

  static Future<void> repondreAvis(String avisId, String reponse) async {
    await ApiClient.post('/avis/repondre', body: {'avisId': avisId, 'reponse': reponse});
  }

  static Future<void> modifierReponseAvis(String avisId, String reponse) async {
    await ApiClient.patch('/avis/$avisId/reponse', body: {'reponse': reponse});
  }

  static Future<void> supprimerReponseAvis(String avisId) async {
    await ApiClient.delete('/avis/$avisId/reponse');
  }

  static Future<List<ReservationDetaillee>> listerReservationsPrestataire({String? statut}) async {
    final params = <String, String>{};
    if (statut != null) params['statut'] = statut;
    final data = await ApiClient.get('/reservations/recues/liste', params: params.isNotEmpty ? params : null);
    final items = (data is Map ? data['items'] as List<dynamic>? : data as List<dynamic>?) ?? [];
    return items.map((e) => ReservationDetaillee.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<Map<String, dynamic>> obtenirCalendrier({String? mois}) async {
    final params = <String, String>{};
    if (mois != null) params['mois'] = mois;
    return (await ApiClient.get('/prestataires/moi/calendrier', params: params.isNotEmpty ? params : null)) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> obtenirStatistiques() async {
    return (await ApiClient.get('/prestataires/moi/statistiques')) as Map<String, dynamic>;
  }

  static Future<List<dynamic>> listerPeriodesIndisponibles() async {
    final data = await ApiClient.get('/indisponibilites/moi');
    if (data is List) return data;
    return [];
  }

  static Future<Map<String, dynamic>> creerPeriodeIndisponible(Map<String, dynamic> body) async {
    return (await ApiClient.post('/indisponibilites/', body: body)) as Map<String, dynamic>;
  }

  static Future<void> supprimerPeriodeIndisponible(String periodeId) async {
    await ApiClient.delete('/indisponibilites/$periodeId');
  }

  static Future<void> repondreReservation(String reservationId, bool accepter) async {
    await ApiClient.post('/reservations/$reservationId/repondre', body: {
      'accepter': accepter,
    });
  }

  static Future<void> entamerReservation(String reservationId) async {
    await ApiClient.post('/reservations/$reservationId/entamer');
  }

  static Future<void> cloturerReservation(String reservationId, {String statut = 'TERMINEE'}) async {
    await ApiClient.post('/reservations/$reservationId/cloturer', body: {'statut': statut});
  }

  static Future<Map<String, dynamic>> obtenirReservationParNumero(String numero) async {
    return (await ApiClient.get('/reservations/par-numero/${Uri.encodeComponent(numero)}')) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> obtenirDetailReservationParId(String reservationId) async {
    return (await ApiClient.get('/reservations/$reservationId')) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> creerProfilPrestataire(Map<String, dynamic> body) async {
    return (await ApiClient.post('/prestataires', body: body)) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> modifierProfilPrestataire(Map<String, dynamic> body) async {
    return (await ApiClient.patch('/prestataires/moi', body: body)) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>?> obtenirAbonnement() async {
    try {
      return (await ApiClient.get('/prestataires/moi/abonnement')) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<List<dynamic>> listerProches(double latitude, double longitude, {int? rayonKm, String? categorie, String? ville}) async {
    final params = <String, String>{
      'latitude': latitude.toStringAsFixed(6),
      'longitude': longitude.toStringAsFixed(6),
    };
    if (rayonKm != null) params['rayonKm'] = '$rayonKm';
    if (categorie != null) params['categorie'] = categorie;
    if (ville != null) params['ville'] = ville;
    return (await ApiClient.get('/prestataires/proches', params: params)) as List<dynamic>;
  }

  /// Télécharge le rapport CSV des réservations (export)
  static Future<String> telechargerRapportCsv({String? dateDebut, String? dateFin}) async {
    final params = <String, String>{};
    if (dateDebut != null) params['dateDebut'] = dateDebut;
    if (dateFin != null) params['dateFin'] = dateFin;
    return ApiClient.getTexte('/paiements/rapport/csv', params: params);
  }

  static Future<Uint8List> telechargerRapportPdf({String? periode}) async {
    final params = <String, String>{};
    if (periode != null) params['periode'] = periode;
    return ApiClient.getOctets('/paiements/rapport/pdf', params: params);
  }
}
