import 'package:flutter/material.dart';
import 'enums.dart';

/// Vocabulaire du « mode ressources » (API : modeReservation = TABLE) selon la catégorie :
/// un restaurant gère des tables, un centre d'affaires des salles, une clinique des praticiens…
/// Le libellé personnalisé du service (libelleRessource) a priorité sur celui de la catégorie.
class UniteRessource {
  final String singulier;
  final String pluriel;
  final IconData icone;
  /// Exemple de nom proposé dans les formulaires
  final String exemple;
  /// Capacité proposée par défaut à la création
  final int capaciteDefaut;

  const UniteRessource._(this.singulier, this.pluriel, this.icone, this.exemple, this.capaciteDefaut);

  String get minuscule => singulier.toLowerCase();
  String get plurielMinuscule => pluriel.toLowerCase();

  static const _parCategorie = {
    CategorieService.restauration: UniteRessource._('Table', 'Tables', Icons.table_restaurant, 'Table 12, Terrasse 3', 4),
    CategorieService.salleReunion: UniteRessource._('Salle', 'Salles', Icons.meeting_room_outlined, 'Salle Congo, Salle A', 10),
    CategorieService.sante: UniteRessource._('Praticien', 'Praticiens', Icons.medical_services_outlined, 'Dr Mbuyi, Cabinet 2', 1),
    CategorieService.education: UniteRessource._('Salle', 'Salles', Icons.school_outlined, 'Salle 101, Labo', 20),
    CategorieService.administratif: UniteRessource._('Guichet', 'Guichets', Icons.storefront_outlined, 'Guichet 1', 1),
    CategorieService.hotellerie: UniteRessource._('Chambre', 'Chambres', Icons.bed_outlined, 'Chambre 204', 2),
    CategorieService.transport: UniteRessource._('Véhicule', 'Véhicules', Icons.directions_bus_outlined, 'Bus 3', 30),
  };

  static const _generique = UniteRessource._('Ressource', 'Ressources', Icons.category_outlined, 'Poste 1', 1);

  /// Vocabulaire déduit de la catégorie, ou du libellé saisi par le prestataire s'il existe.
  static UniteRessource pour(String? categorie, [String? libellePerso]) {
    final base = _parCategorie[categorie] ?? _generique;
    final perso = libellePerso?.trim() ?? '';
    if (perso.isEmpty) return base;
    final pluriel = RegExp(r'[sxz]$', caseSensitive: false).hasMatch(perso) ? perso : '${perso}s';
    return UniteRessource._(perso, pluriel, base.icone, base.exemple, base.capaciteDefaut);
  }
}
