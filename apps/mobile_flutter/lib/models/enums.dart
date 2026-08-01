class CategorieService {
  static const sante = 'SANTE';
  static const transport = 'TRANSPORT';
  static const hotellerie = 'HOTELLERIE';
  static const restauration = 'RESTAURATION';
  static const salleReunion = 'SALLE_REUNION';
  static const administratif = 'ADMINISTRATIF';
  static const education = 'EDUCATION';

  static const List<String> values = [sante, transport, hotellerie, restauration, salleReunion, administratif, education];

  static String libelle(String cat) {
    switch (cat) {
      case sante: return 'Santé';
      case transport: return 'Transport';
      case hotellerie: return 'Hôtellerie';
      case restauration: return 'Restauration';
      case salleReunion: return 'Salle de réunion';
      case administratif: return 'Service administratif';
      case education: return 'Éducation';
      default: return cat;
    }
  }
}

class StatutReservation {
  static const enAttente = 'EN_ATTENTE';
  static const confirmee = 'CONFIRMEE';
  static const enCours = 'EN_COURS';
  static const refusee = 'REFUSEE';
  static const annulee = 'ANNULEE';
  static const terminee = 'TERMINEE';
  static const absence = 'ABSENCE';

  static const List<String> values = [enAttente, confirmee, enCours, refusee, annulee, terminee, absence];

  static String libelle(String s) {
    switch (s) {
      case enAttente: return 'En attente';
      case confirmee: return 'Confirmée';
      case enCours: return 'En cours';
      case refusee: return 'Refusée';
      case annulee: return 'Annulée';
      case terminee: return 'Terminée';
      case absence: return 'Absence';
      default: return s;
    }
  }
}

class StatutPaiement {
  static const enAttente = 'EN_ATTENTE';
  static const partiel = 'PARTIEL';
  static const paye = 'PAYE';
  static const rembourse = 'REMBOURSE';
  static const echoue = 'ECHOUE';
}

class OperateurMobileMoney {
  static const mpesa = 'MPESA';
  static const airtelMoney = 'AIRTEL_MONEY';
  static const orangeMoney = 'ORANGE_MONEY';
  static const especes = 'ESPECES';
}

class RoleUtilisateur {
  static const client = 'CLIENT';
  static const prestataire = 'PRESTATAIRE';
  static const admin = 'ADMIN';
}

class StatutPrestataire {
  static const enAttenteValidation = 'EN_ATTENTE_VALIDATION';
  static const approuve = 'APPROUVE';
  static const rejete = 'REJETE';
  static const suspendu = 'SUSPENDU';
}

class Devise {
  static const cdf = 'CDF';
  static const usd = 'USD';
}

class Langue {
  static const fr = 'fr';
  static const ln = 'ln';
  static const sw = 'sw';
}
