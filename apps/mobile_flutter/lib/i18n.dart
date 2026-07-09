class AppTraductions {
  static final Map<String, Map<String, String>> _donnees = {
    'fr': {
      'appName': 'RESERVA',
      'slogan': 'Réservez. Sereinement.',
      'recherche': 'Rechercher',
      'connexion': 'Connexion',
      'inscription': 'Inscription',
      'deconnexion': 'Déconnexion',
      'profil': 'Profil',
      'reservations': 'Réservations',
      'prestataire': 'Prestataire',
      'accueil': 'Accueil',
      'mesReservations': 'Mes réservations',
      'aucunService': 'Aucun service trouvé.',
      'annuler': 'Annuler',
      'confirmer': 'Confirmer',
      'payer': 'Payer',
      'montantTotal': 'Montant total',
      'codePin': 'Code PIN',
      'telephone': 'Numéro de téléphone',
      'motDePasseOublie': 'Mot de passe oublié ?',
      'reinitialiserPin': 'Réinitialiser le code PIN',
      'nouveauPin': 'Nouveau code PIN',
      'confirmerPin': 'Confirmer le code PIN',
      'envoyerCode': 'Envoyer le code',
      'modifier': 'Modifier',
    },
    'ln': {
      'appName': 'RESERVA',
      'slogan': 'Bobénga. Na kimia.',
      'recherche': 'Koluka',
      'connexion': 'Kokota',
      'inscription': 'Komisakisa',
      'deconnexion': 'Kobima',
      'profil': 'Profile',
      'reservations': 'Bobéngi',
      'prestataire': 'Mokabi',
      'accueil': 'Mokolo',
      'mesReservations': 'Bobéngi na ngai',
      'annuler': 'Koboyana',
      'confirmer': 'Kondima',
      'payer': 'Kofuta',
      'montantTotal': 'Ntalo na nsuka',
      'codePin': 'Code PIN',
      'telephone': 'Nimero ya telefone',
      'motDePasseOublie': 'Bobosana code ?',
      'reinitialiserPin': 'Kobongola code PIN',
      'nouveauPin': 'Code PIN ya sika',
      'confirmerPin': 'Kondima code PIN',
      'envoyerCode': 'Kotinda code',
      'modifier': 'Kobongola',
    },
    'sw': {
      'appName': 'RESERVA',
      'slogan': 'Hifadhi. Kwa amani.',
      'recherche': 'Tafuta',
      'connexion': 'Ingia',
      'inscription': 'Jisajili',
      'deconnexion': 'Toka',
      'profil': 'Wasifu',
      'reservations': 'Uhifadhi',
      'prestataire': 'Mtoa huduma',
      'accueil': 'Nyumbani',
      'mesReservations': 'Uhifadhi wangu',
      'annuler': 'Ghairi',
      'confirmer': 'Thibitisha',
      'payer': 'Lipa',
      'montantTotal': 'Jumla',
      'codePin': 'Nambari ya PIN',
      'telephone': 'Nambari ya simu',
      'motDePasseOublie': 'Umesahau PIN ?',
      'reinitialiserPin': 'Weka PIN mpya',
      'nouveauPin': 'PIN mpya',
      'confirmerPin': 'Thibitisha PIN',
      'envoyerCode': 'Tuma msimbo',
      'modifier': 'Badilisha',
    },
  };

  static String _langueCourante = 'fr';

  static String get langueCourante => _langueCourante;

  static void definirLangue(String langue) {
    if (_donnees.containsKey(langue)) {
      _langueCourante = langue;
    }
  }

  static String t(String cle) {
    return _donnees[_langueCourante]?[cle] ?? _donnees['fr']?[cle] ?? cle;
  }
}
