export 'enums.dart';

class Utilisateur {
  final String id;
  final String telephone;
  final String? email;
  final String nom;
  final String role;
  final String langue;
  final String? photoUrl;
  final bool telephoneVerifie;
  final bool? deuxFAActif;
  final String creeLe;

  Utilisateur({
    required this.id,
    required this.telephone,
    this.email,
    required this.nom,
    required this.role,
    required this.langue,
    this.photoUrl,
    required this.telephoneVerifie,
    this.deuxFAActif,
    required this.creeLe,
  });

  factory Utilisateur.fromJson(Map<String, dynamic> json) => Utilisateur(
    id: json['id'] as String,
    telephone: json['telephone'] as String,
    email: json['email'] as String?,
    nom: json['nom'] as String,
    role: json['role'] as String,
    langue: json['langue'] as String,
    photoUrl: json['photoUrl'] as String?,
    telephoneVerifie: json['telephoneVerifie'] as bool? ?? false,
    deuxFAActif: json['deuxFAActif'] as bool?,
    creeLe: json['creeLe'] as String,
  );
}

class Prestataire {
  final String id;
  final String utilisateurId;
  final String nomEntreprise;
  final String categorie;
  final String ville;
  final String quartier;
  final String? adresse;
  final String? description;
  final double? latitude;
  final double? longitude;
  final String statut;
  final double noteMoyenne;
  final int nombreAvis;
  final double scoreConfiance;
  final bool badgeVerifieTerrain;
  final double tauxCompletionPourcent;
  final int delaiAnnulationGratuiteHeures;
  final int fraisAnnulationTardivePourcent;
  final String creeLe;

  Prestataire({
    required this.id,
    required this.utilisateurId,
    required this.nomEntreprise,
    required this.categorie,
    required this.ville,
    required this.quartier,
    this.adresse,
    this.description,
    this.latitude,
    this.longitude,
    required this.statut,
    required this.noteMoyenne,
    required this.nombreAvis,
    this.scoreConfiance = 50,
    this.badgeVerifieTerrain = false,
    this.tauxCompletionPourcent = 100,
    required this.delaiAnnulationGratuiteHeures,
    required this.fraisAnnulationTardivePourcent,
    required this.creeLe,
  });

  factory Prestataire.fromJson(Map<String, dynamic> json) => Prestataire(
    id: json['id'] as String,
    utilisateurId: json['utilisateurId'] as String? ?? '',
    nomEntreprise: json['nomEntreprise'] as String,
    categorie: json['categorie'] as String,
    ville: json['ville'] as String,
    quartier: json['quartier'] as String,
    adresse: json['adresse'] as String?,
    description: json['description'] as String?,
    latitude: (json['latitude'] as num?)?.toDouble(),
    longitude: (json['longitude'] as num?)?.toDouble(),
    statut: json['statut'] as String,
    noteMoyenne: (json['noteMoyenne'] as num?)?.toDouble() ?? 0.0,
    nombreAvis: json['nombreAvis'] as int? ?? 0,
    scoreConfiance: (json['scoreConfiance'] as num?)?.toDouble() ?? 50,
    badgeVerifieTerrain: json['badgeVerifieTerrain'] as bool? ?? false,
    tauxCompletionPourcent: (json['tauxCompletionPourcent'] as num?)?.toDouble() ?? 100,
    delaiAnnulationGratuiteHeures: json['delaiAnnulationGratuiteHeures'] as int? ?? 24,
    fraisAnnulationTardivePourcent: json['fraisAnnulationTardivePourcent'] as int? ?? 50,
    creeLe: json['creeLe'] as String? ?? '',
  );
}

class ServiceOffert {
  final String id;
  final String prestataireId;
  final String nom;
  final String? description;
  final int dureeMinutes;
  final double prix;
  final String devise;
  final bool actif;

  ServiceOffert({
    required this.id,
    required this.prestataireId,
    required this.nom,
    this.description,
    required this.dureeMinutes,
    required this.prix,
    required this.devise,
    required this.actif,
  });

  factory ServiceOffert.fromJson(Map<String, dynamic> json) => ServiceOffert(
    id: json['id'] as String,
    prestataireId: json['prestataireId'] as String,
    nom: json['nom'] as String,
    description: json['description'] as String?,
    dureeMinutes: json['dureeMinutes'] as int? ?? 60,
    prix: (json['prix'] as num?)?.toDouble() ?? 0.0,
    devise: json['devise'] as String? ?? 'CDF',
    actif: json['actif'] as bool? ?? true,
  );
}

class Creneau {
  final String id;
  final String serviceId;
  final String debut;
  final String fin;
  final int capaciteTotale;
  final int capaciteReservee;
  final bool disponible;
  final bool bloque;

  Creneau({
    required this.id,
    required this.serviceId,
    required this.debut,
    required this.fin,
    required this.capaciteTotale,
    required this.capaciteReservee,
    required this.disponible,
    this.bloque = false,
  });

  factory Creneau.fromJson(Map<String, dynamic> json) => Creneau(
    id: json['id'] as String,
    serviceId: json['serviceId'] as String,
    debut: json['debut'] as String,
    fin: json['fin'] as String,
    capaciteTotale: json['capaciteTotale'] as int? ?? 1,
    capaciteReservee: json['capaciteReservee'] as int? ?? 0,
    disponible: json['disponible'] as bool? ?? true,
    bloque: json['bloque'] as bool? ?? false,
  );
}

class Reservation {
  final String id;
  final String numero;
  final String clientId;
  final String prestataireId;
  final String serviceId;
  final String creneauId;
  final String statut;
  final String statutPaiement;
  final double montantTotal;
  final double montantPaye;
  final double montantReduction;
  final int pointsUtilises;
  final double avoirUtilise;
  final String devise;
  final String? notes;
  final bool reservePourTiers;
  final String? nomTiers;
  final String? telephoneTiers;
  final String? recurrenceGroupeId;
  final bool garantieActive;
  final bool garantieUtilisee;
  final int acomptePourcent;
  final String creeLe;
  final String misAJourLe;

  Reservation({
    required this.id,
    required this.numero,
    required this.clientId,
    required this.prestataireId,
    required this.serviceId,
    required this.creneauId,
    required this.statut,
    required this.statutPaiement,
    required this.montantTotal,
    required this.montantPaye,
    this.montantReduction = 0,
    this.pointsUtilises = 0,
    this.avoirUtilise = 0,
    required this.devise,
    this.notes,
    required this.reservePourTiers,
    this.nomTiers,
    this.telephoneTiers,
    this.recurrenceGroupeId,
    this.garantieActive = true,
    this.garantieUtilisee = false,
    this.acomptePourcent = 30,
    required this.creeLe,
    required this.misAJourLe,
  });

  factory Reservation.fromJson(Map<String, dynamic> json) => Reservation(
    id: json['id'] as String,
    numero: json['numero'] as String,
    clientId: json['clientId'] as String,
    prestataireId: json['prestataireId'] as String,
    serviceId: json['serviceId'] as String,
    creneauId: json['creneauId'] as String,
    statut: json['statut'] as String,
    statutPaiement: json['statutPaiement'] as String,
    montantTotal: (json['montantTotal'] as num?)?.toDouble() ?? 0.0,
    montantPaye: (json['montantPaye'] as num?)?.toDouble() ?? 0.0,
    montantReduction: (json['montantReduction'] as num?)?.toDouble() ?? 0.0,
    pointsUtilises: (json['pointsUtilises'] as num?)?.toInt() ?? 0,
    avoirUtilise: (json['avoirUtilise'] as num?)?.toDouble() ?? 0.0,
    devise: json['devise'] as String? ?? 'CDF',
    notes: json['notes'] as String?,
    reservePourTiers: json['reservePourTiers'] as bool? ?? false,
    nomTiers: json['nomTiers'] as String?,
    telephoneTiers: json['telephoneTiers'] as String?,
    recurrenceGroupeId: json['recurrenceGroupeId'] as String?,
    garantieActive: json['garantieActive'] as bool? ?? true,
    garantieUtilisee: json['garantieUtilisee'] as bool? ?? false,
    acomptePourcent: (json['acomptePourcent'] as num?)?.toInt() ?? 30,
    creeLe: json['creeLe'] as String,
    misAJourLe: json['misAJourLe'] as String,
  );
}

class Transaction {
  final String id;
  final String reservationId;
  final String operateur;
  final double montant;
  final String devise;
  final String statut;
  final String? referenceExterne;
  final String creeLe;

  Transaction({
    required this.id,
    required this.reservationId,
    required this.operateur,
    required this.montant,
    required this.devise,
    required this.statut,
    this.referenceExterne,
    required this.creeLe,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) => Transaction(
    id: json['id'] as String,
    reservationId: json['reservationId'] as String,
    operateur: json['operateur'] as String,
    montant: (json['montant'] as num?)?.toDouble() ?? 0.0,
    devise: json['devise'] as String? ?? 'CDF',
    statut: json['statut'] as String,
    referenceExterne: json['referenceExterne'] as String?,
    creeLe: json['creeLe'] as String,
  );
}

class PointTransaction {
  final String id;
  final String type;
  final int montantPoints;
  final int soldeApres;
  final String? description;
  final String creeLe;

  PointTransaction({
    required this.id,
    required this.type,
    required this.montantPoints,
    required this.soldeApres,
    this.description,
    required this.creeLe,
  });

  factory PointTransaction.fromJson(Map<String, dynamic> json) => PointTransaction(
    id: json['id'] as String,
    type: json['type'] as String,
    montantPoints: json['montantPoints'] as int? ?? 0,
    soldeApres: json['soldeApres'] as int? ?? 0,
    description: json['description'] as String?,
    creeLe: json['creeLe'] as String,
  );
}

class Avis {
  final String id;
  final String reservationId;
  final String clientId;
  final String prestataireId;
  final int note;
  final String? commentaire;
  final String? reponsePrestataire;
  final String creeLe;

  Avis({
    required this.id,
    required this.reservationId,
    required this.clientId,
    required this.prestataireId,
    required this.note,
    this.commentaire,
    this.reponsePrestataire,
    required this.creeLe,
  });

  factory Avis.fromJson(Map<String, dynamic> json) => Avis(
    id: json['id'] as String,
    reservationId: json['reservationId'] as String,
    clientId: json['clientId'] as String,
    prestataireId: json['prestataireId'] as String,
    note: json['note'] as int? ?? 5,
    commentaire: json['commentaire'] as String?,
    reponsePrestataire: json['reponsePrestataire'] as String?,
    creeLe: json['creeLe'] as String,
  );
}

class ServiceAvecPrestataire {
  final String id;
  final String nom;
  final String? description;
  final double prix;
  final String devise;
  final String nomEntreprise;
  final String categorie;
  final String ville;
  final String quartier;
  final double noteMoyenne;
  final int nombreAvis;
  final List<CreneauSimple> creneaux;
  final double? distanceKm;
  final double? latitude;
  final double? longitude;

  ServiceAvecPrestataire({
    required this.id,
    required this.nom,
    this.description,
    required this.prix,
    required this.devise,
    required this.nomEntreprise,
    required this.categorie,
    required this.ville,
    required this.quartier,
    required this.noteMoyenne,
    required this.nombreAvis,
    required this.creneaux,
    this.distanceKm,
    this.latitude,
    this.longitude,
  });

  factory ServiceAvecPrestataire.fromJson(Map<String, dynamic> json) {
    final presta = json['prestataire'] as Map<String, dynamic>? ?? {};
    final creneauxList = json['creneaux'] as List<dynamic>? ?? [];
    return ServiceAvecPrestataire(
      id: json['id'] as String,
      nom: json['nom'] as String,
      description: json['description'] as String?,
      prix: (json['prix'] as num?)?.toDouble() ?? 0.0,
      devise: json['devise'] as String? ?? 'CDF',
      nomEntreprise: presta['nomEntreprise'] as String? ?? '',
      categorie: presta['categorie'] as String? ?? '',
      ville: presta['ville'] as String? ?? '',
      quartier: presta['quartier'] as String? ?? '',
      noteMoyenne: (presta['noteMoyenne'] as num?)?.toDouble() ?? 0.0,
      nombreAvis: presta['nombreAvis'] as int? ?? 0,
      creneaux: creneauxList.map((c) => CreneauSimple.fromJson(c as Map<String, dynamic>)).toList(),
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      latitude: (presta['latitude'] as num?)?.toDouble(),
      longitude: (presta['longitude'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'nom': nom,
    'description': description,
    'prix': prix,
    'devise': devise,
    'prestataire': {
      'nomEntreprise': nomEntreprise,
      'categorie': categorie,
      'ville': ville,
      'quartier': quartier,
      'noteMoyenne': noteMoyenne,
      'nombreAvis': nombreAvis,
      'latitude': latitude,
      'longitude': longitude,
    },
    'creneaux': creneaux.map((c) => c.toJson()).toList(),
  };
}

class CreneauSimple {
  final String id;
  final String debut;
  final String fin;
  final int capaciteTotale;
  final int capaciteReservee;

  CreneauSimple({
    required this.id,
    required this.debut,
    required this.fin,
    required this.capaciteTotale,
    required this.capaciteReservee,
  });

  factory CreneauSimple.fromJson(Map<String, dynamic> json) => CreneauSimple(
    id: json['id'] as String,
    debut: json['debut'] as String,
    fin: json['fin'] as String,
    capaciteTotale: json['capaciteTotale'] as int? ?? 1,
    capaciteReservee: json['capaciteReservee'] as int? ?? 0,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'debut': debut,
    'fin': fin,
    'capaciteTotale': capaciteTotale,
    'capaciteReservee': capaciteReservee,
  };
}

class ReservationDetaillee {
  final Reservation reservation;
  final ServiceOffert service;
  final Prestataire prestataire;
  final Creneau creneau;
  final int? avisNote;

  ReservationDetaillee({
    required this.reservation,
    required this.service,
    required this.prestataire,
    required this.creneau,
    this.avisNote,
  });

  factory ReservationDetaillee.fromJson(Map<String, dynamic> json) {
    final avis = json['avis'] as Map<String, dynamic>?;
    return ReservationDetaillee(
      reservation: Reservation.fromJson(json),
      service: ServiceOffert.fromJson(json['service'] as Map<String, dynamic>),
      prestataire: Prestataire.fromJson(json['prestataire'] as Map<String, dynamic>),
      creneau: Creneau.fromJson(json['creneau'] as Map<String, dynamic>),
      avisNote: avis?['note'] as int?,
    );
  }
}

class ReponseApi {
  final bool succes;
  final Map<String, dynamic>? donnees;
  final String? erreurMessage;

  ReponseApi({required this.succes, this.donnees, this.erreurMessage});
}

class ResultatPagine<T> {
  final List<T> items;
  final int total;
  final int page;
  final int parPage;
  final int totalPages;

  ResultatPagine({
    required this.items,
    required this.total,
    required this.page,
    required this.parPage,
    required this.totalPages,
  });
}
