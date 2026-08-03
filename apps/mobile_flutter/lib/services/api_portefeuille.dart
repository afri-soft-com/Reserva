import 'api_client.dart';

class LigneHistorique {
  final String type;
  final String date;
  final String libelle;
  final double? montant;
  final String? devise;
  final String? operateur;
  final String? reference;
  final int? points;
  final String? sens;
  final double? restant;
  final double? solde;
  final String? statut;

  LigneHistorique({
    required this.type,
    required this.date,
    required this.libelle,
    this.montant,
    this.devise,
    this.operateur,
    this.reference,
    this.points,
    this.sens,
    this.restant,
    this.solde,
    this.statut,
  });

  factory LigneHistorique.fromJson(Map<String, dynamic> json) => LigneHistorique(
    type: json['type'] as String? ?? '',
    date: json['date'] as String? ?? '',
    libelle: json['libelle'] as String? ?? '',
    montant: (json['montant'] as num?)?.toDouble(),
    devise: json['devise'] as String?,
    operateur: json['operateur'] as String?,
    reference: json['reference'] as String?,
    points: json['points'] as int?,
    sens: json['sens'] as String?,
    restant: (json['restant'] as num?)?.toDouble(),
    solde: (json['solde'] as num?)?.toDouble(),
    statut: json['statut'] as String?,
  );
}

class PortefeuilleData {
  final int soldeAvoirs;
  final String deviseAvoirs;
  final int nombreAvoirs;
  final int pointsFidelite;
  final double valeurPointsFC;
  final double soldeCartesCadeaux;
  final int nombreCartesCadeaux;
  final List<LigneHistorique> historique;

  PortefeuilleData({
    required this.soldeAvoirs,
    required this.deviseAvoirs,
    required this.nombreAvoirs,
    required this.pointsFidelite,
    required this.valeurPointsFC,
    required this.soldeCartesCadeaux,
    required this.nombreCartesCadeaux,
    required this.historique,
  });

  factory PortefeuilleData.fromJson(Map<String, dynamic> json) {
    final avoirs = json['avoirs'] as Map<String, dynamic>? ?? {};
    final fidelite = json['fidelite'] as Map<String, dynamic>? ?? {};
    final cartes = json['cartesCadeaux'] as Map<String, dynamic>? ?? {};
    return PortefeuilleData(
      soldeAvoirs: (avoirs['solde'] as num?)?.toInt() ?? 0,
      deviseAvoirs: avoirs['devise'] as String? ?? 'CDF',
      nombreAvoirs: (avoirs['nombre'] as num?)?.toInt() ?? 0,
      pointsFidelite: (fidelite['points'] as num?)?.toInt() ?? 0,
      valeurPointsFC: (fidelite['valeurEnFC'] as num?)?.toDouble() ?? 0,
      soldeCartesCadeaux: (cartes['solde'] as num?)?.toDouble() ?? 0,
      nombreCartesCadeaux: (cartes['nombre'] as num?)?.toInt() ?? 0,
      historique: (json['historique'] as List<dynamic>? ?? [])
          .map((e) => LigneHistorique.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ApiPortefeuille {
  static Future<PortefeuilleData> obtenirPortefeuille() async {
    final data = await ApiClient.get('/portefeuille/moi');
    return PortefeuilleData.fromJson(data as Map<String, dynamic>);
  }
}
