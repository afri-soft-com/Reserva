/// Deux applications distinctes (même codebase, flavors différents).
enum AppFlavor { client, prestataire }

class AppFlavorConfig {
  static AppFlavor current = AppFlavor.client;

  static void initialiser(AppFlavor flavor) {
    current = flavor;
  }

  static bool get estPrestataire => current == AppFlavor.prestataire;
  static bool get estClient => current == AppFlavor.client;

  static String get nomApp => estPrestataire ? 'RESERVA Pro' : 'RESERVA';

  static String get roleApi => estPrestataire ? 'PRESTATAIRE' : 'CLIENT';

  static String get sloganAuth =>
      estPrestataire
          ? 'Gérez vos réservations — PIN, SMS ou Google'
          : 'Réservez partout en RDC — PIN, SMS ou Google';

  static String get sousTitreBienvenue =>
      estPrestataire ? 'L\'espace prestataires : agenda, QR, soldes et avis' : 'Hôtels, bus et services — réservez sereinement';

  static bool roleCompatible(String role) {
    if (role == 'ADMIN') return true;
    if (estPrestataire) return role == 'PRESTATAIRE';
    return role == 'CLIENT';
  }
}
