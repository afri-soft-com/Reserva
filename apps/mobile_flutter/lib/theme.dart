import 'package:flutter/material.dart';

/// Palette adaptive : les getters suivent [definirModeSombre].
/// Les constantes *Clair / *Sombre* restent utilisables dans ThemeData.
class AppCouleurs {
  static bool _sombre = false;

  static bool get estSombre => _sombre;

  static void definirModeSombre(bool sombre) {
    _sombre = sombre;
  }

  static const primaire = Color(0xFF1A56DB);
  static const primaireFonce = Color(0xFF0F2A5E);
  static const primaireClairFixe = Color(0xFFEBF2FF);
  static const accent = Color(0xFFF5A623);
  static const succes = Color(0xFF10B981);
  static const succesClair = Color(0xFFD1FAE5);
  static const alerte = Color(0xFFDC2626);
  static const avertissement = Color(0xFFD97706);

  static const texteClair = Color(0xFF1F2937);
  static const texteSecondaireClair = Color(0xFF6B7280);
  static const bordureClair = Color(0xFFD1D5DB);
  static const fondClair = Color(0xFFF9FAFB);
  static const fondChampClair = Color(0xFFF3F4F6);
  static const surfaceClair = Color(0xFFFFFFFF);

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

  /// Alias historiques (adaptatifs).
  static Color get primaireClair => _sombre ? primaireClairSombre : primaireClairFixe;
  static Color get texte => _sombre ? texteSombre : texteClair;
  static Color get texteSecondaire => _sombre ? texteSecondaireSombre : texteSecondaireClair;
  static Color get bordure => _sombre ? bordureSombre : bordureClair;
  static Color get fond => _sombre ? fondSombre : fondClair;
  static Color get fondChamp => _sombre ? fondChampSombre : fondChampClair;
  static Color get blanc => _sombre ? fondCarteSombre : surfaceClair;

  // Compat : anciens noms const encore référencés dans ThemeData sombre.
}

class AppRayons {
  static const bouton = 12.0;
  static const champ = 10.0;
  static const carte = 16.0;
  static const pilule = 99.0;
}

class AppTypographie {
  static TextStyle get titre => TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppCouleurs.texte);
  static TextStyle get sousTitre => TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppCouleurs.texte);
  static TextStyle get corps => TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: AppCouleurs.texte);
  static TextStyle get petit => TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: AppCouleurs.texteSecondaire);
  static TextStyle get label => TextStyle(fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: AppCouleurs.texteSecondaire);
}

class StatutStyles {
  static Map<String, ({Color fond, Color texte})> reservation = {
    'EN_ATTENTE': (fond: const Color(0xFFFEF3C7), texte: const Color(0xFF92400E)),
    'CONFIRMEE': (fond: const Color(0xFFD1FAE5), texte: const Color(0xFF047857)),
    'EN_COURS': (fond: const Color(0xFFEDE9FE), texte: const Color(0xFF5B21B6)),
    'REFUSEE': (fond: const Color(0xFFFEE2E2), texte: const Color(0xFFB91C1C)),
    'ANNULEE': (fond: const Color(0xFFF3F4F6), texte: const Color(0xFF4B5563)),
    'TERMINEE': (fond: const Color(0xFFDBEAFE), texte: const Color(0xFF1D4ED8)),
    'ABSENCE': (fond: const Color(0xFFFEE2E2), texte: const Color(0xFFB91C1C)),
  };
}

PageTransitionsTheme get _transitionsFluides => const PageTransitionsTheme(
  builders: {
    TargetPlatform.android: CupertinoPageTransitionsBuilder(),
    TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
    TargetPlatform.windows: FadeUpwardsPageTransitionsBuilder(),
  },
);

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
    scaffoldBackgroundColor: AppCouleurs.fondClair,
    fontFamily: 'Inter',
    pageTransitionsTheme: _transitionsFluides,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppCouleurs.surfaceClair,
      foregroundColor: AppCouleurs.texteClair,
      elevation: 0,
      centerTitle: true,
    ),
    cardColor: AppCouleurs.surfaceClair,
    dividerColor: AppCouleurs.bordureClair,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppCouleurs.fondChampClair,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRayons.champ),
        borderSide: const BorderSide(color: AppCouleurs.bordureClair),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRayons.champ),
        borderSide: const BorderSide(color: AppCouleurs.bordureClair),
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
        foregroundColor: AppCouleurs.surfaceClair,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRayons.bouton)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppCouleurs.surfaceClair,
      selectedItemColor: AppCouleurs.primaire,
      unselectedItemColor: AppCouleurs.texteSecondaireClair,
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
    pageTransitionsTheme: _transitionsFluides,
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
        foregroundColor: AppCouleurs.surfaceClair,
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
