import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:reserva/main.dart';
import 'package:reserva/providers/auth_provider.dart';
import 'package:reserva/providers/theme_provider.dart';
import 'package:reserva/theme.dart';

void main() {
  testWidgets('Lancer l\'app affiche le splash', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => ThemeProvider()..initialiser()),
        ],
        child: const ReservaApp(),
      ),
    );

    expect(find.text('RESERVA'), findsOneWidget);
    expect(find.text('Réservez. Sereinement.'), findsOneWidget);
  });

  testWidgets('AppTheme retourne un ThemeData valide', (tester) async {
    final theme = appTheme();
    expect(theme, isA<ThemeData>());
    expect(theme.primaryColor, equals(AppCouleurs.primaire));
  });

  test('AppCouleurs a des valeurs définies', () {
    expect(AppCouleurs.primaire, isNotNull);
    expect(AppCouleurs.fond, isNotNull);
    expect(AppCouleurs.alerte, isNotNull);
    expect(AppCouleurs.succes, isNotNull);
  });
}
