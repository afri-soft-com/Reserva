import 'package:flutter/material.dart';

class AppCouleurs {
  static const primaire = Color(0xFF1A56DB);
  static const primaireFonce = Color(0xFF0F2A5E);
  static const primaireClair = Color(0xFFEBF2FF);
  static const accent = Color(0xFFF5A623);
  static const succes = Color(0xFF10B981);
  static const succesClair = Color(0xFFD1FAE5);
  static const alerte = Color(0xFFDC2626);
  static const avertissement = Color(0xFFD97706);
  static const texte = Color(0xFF1F2937);
  static const texteSecondaire = Color(0xFF6B7280);
  static const bordure = Color(0xFFD1D5DB);
  static const fond = Color(0xFFF9FAFB);
  static const fondChamp = Color(0xFFF3F4F6);
  static const blanc = Color(0xFFFFFFFF);

  static const primaireSombre = Color(0xFF3B82F6);
  static const primaireFonceSombre = Color(0xFF93B8FF);
  static const primaireClairSombre = Color(0xFF1E293B);
  static const texteSombre = Color(0xFFF1F5F9);
  static const texteSecondaireSombre = Color(0xFF94A3B8);
  static const bordureSombre = Color(0xFF334155);
  static const fondSombre = Color(0xFF0F172A);
  static const fondChampSombre = Color(0xFF1E293B);
  static const fondCarteSombre = Color(0xFF1E293B);
  static const noir = Color(0xFF000000);
}

class AppRayons {
  static const bouton = 12.0;
  static const champ = 10.0;
  static const carte = 16.0;
  static const pilule = 99.0;
}

class AppTypographie {
  static const titre = TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppCouleurs.texte);
  static const sousTitre = TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppCouleurs.texte);
  static const corps = TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: AppCouleurs.texte);
  static const petit = TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: AppCouleurs.texteSecondaire);
  static const label = TextStyle(fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.5);
}

class StatutStyles {
  static Map<String, ({Color fond, Color texte})> reservation = {
    'EN_ATTENTE': (fond: const Color(0xFFFEF3C7), texte: const Color(0xFF92400E)),
    'CONFIRMEE': (fond: const Color(0xFFD1FAE5), texte: const Color(0xFF047857)),
    'REFUSEE': (fond: const Color(0xFFFEE2E2), texte: const Color(0xFFB91C1C)),
    'ANNULEE': (fond: const Color(0xFFF3F4F6), texte: const Color(0xFF4B5563)),
    'TERMINEE': (fond: const Color(0xFFDBEAFE), texte: const Color(0xFF1D4ED8)),
    'ABSENCE': (fond: const Color(0xFFFEE2E2), texte: const Color(0xFFB91C1C)),
  };
}

ThemeData appTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppCouleurs.primaire,
      primary: AppCouleurs.primaire,
      error: AppCouleurs.alerte,
      brightness: Brightness.light,
    ),
    scaffoldBackgroundColor: AppCouleurs.fond,
    fontFamily: 'Inter',
    appBarTheme: const AppBarTheme(
      backgroundColor: AppCouleurs.blanc,
      foregroundColor: AppCouleurs.texte,
      elevation: 0,
      centerTitle: true,
    ),
    cardColor: AppCouleurs.blanc,
    dividerColor: AppCouleurs.bordure,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppCouleurs.fondChamp,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRayons.champ),
        borderSide: const BorderSide(color: AppCouleurs.bordure),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRayons.champ),
        borderSide: const BorderSide(color: AppCouleurs.bordure),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRayons.champ),
        borderSide: const BorderSide(color: AppCouleurs.primaire, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppCouleurs.primaire,
        foregroundColor: AppCouleurs.blanc,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRayons.bouton)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppCouleurs.blanc,
      selectedItemColor: AppCouleurs.primaire,
      unselectedItemColor: AppCouleurs.texteSecondaire,
    ),
  );
}

ThemeData appThemeSombre() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppCouleurs.primaire,
      primary: AppCouleurs.primaireSombre,
      error: AppCouleurs.alerte,
      brightness: Brightness.dark,
    ),
    scaffoldBackgroundColor: AppCouleurs.fondSombre,
    fontFamily: 'Inter',
    appBarTheme: const AppBarTheme(
      backgroundColor: AppCouleurs.fondCarteSombre,
      foregroundColor: AppCouleurs.texteSombre,
      elevation: 0,
      centerTitle: true,
    ),
    cardColor: AppCouleurs.fondCarteSombre,
    dividerColor: AppCouleurs.bordureSombre,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppCouleurs.fondChampSombre,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRayons.champ),
        borderSide: const BorderSide(color: AppCouleurs.bordureSombre),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRayons.champ),
        borderSide: const BorderSide(color: AppCouleurs.bordureSombre),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRayons.champ),
        borderSide: const BorderSide(color: AppCouleurs.primaireSombre, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppCouleurs.primaireSombre,
        foregroundColor: AppCouleurs.blanc,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRayons.bouton)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppCouleurs.fondCarteSombre,
      selectedItemColor: AppCouleurs.primaireSombre,
      unselectedItemColor: AppCouleurs.texteSecondaireSombre,
    ),
  );
}
