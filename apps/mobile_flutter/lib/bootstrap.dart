import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'app_flavor.dart';
import 'providers/auth_provider.dart';
import 'providers/langue_provider.dart';
import 'providers/theme_provider.dart';
import 'router.dart';
import 'theme.dart';
import 'widgets/biometrie_lock.dart';
import 'widgets/mise_a_jour_gate.dart';

/// DSN Sentry injecté par la CI (secret SENTRY_DSN_MOBILE). Vide = suivi désactivé.
const String _sentryDsn = String.fromEnvironment('SENTRY_DSN');

Future<void> demarrerApp({required AppFlavor roleForce}) async {
  WidgetsFlutterBinding.ensureInitialized();
  AppFlavorConfig.initialiser(roleForce);
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  final auth = AuthProvider();
  await auth.initialiser();

  final langue = LangueProvider();
  await langue.initialiser();

  final theme = ThemeProvider();
  await theme.initialiser();
  AppCouleurs.definirModeSombre(theme.estSombre);

  void lancer() => runApp(
        MultiProvider(
          providers: [
            ChangeNotifierProvider.value(value: auth),
            ChangeNotifierProvider.value(value: langue),
            ChangeNotifierProvider.value(value: theme),
          ],
          child: ReservaApp(auth: auth),
        ),
      );

  if (_sentryDsn.isEmpty) {
    lancer();
    return;
  }
  await SentryFlutter.init(
    (options) {
      options.dsn = _sentryDsn;
      options.environment = AppFlavorConfig.estPrestataire ? 'pro' : 'client';
      // Plantages et erreurs seulement : pas de traces de performance ni de données personnelles.
      options.tracesSampleRate = 0;
      options.sendDefaultPii = false;
    },
    appRunner: lancer,
  );
}

class ReservaApp extends StatelessWidget {
  final AuthProvider auth;
  const ReservaApp({super.key, required this.auth});

  @override
  Widget build(BuildContext context) {
    final router = createRouter(auth);
    final themeMode = context.watch<ThemeProvider>().mode;
    return MaterialApp.router(
      title: AppFlavorConfig.nomApp,
      debugShowCheckedModeBanner: false,
      theme: appTheme(),
      darkTheme: appThemeSombre(),
      themeMode: themeMode,
      routerConfig: router,
      // Column soft (pas Overlay) : bannière toujours au-dessus des Scaffold.
      builder: (context, child) => MiseAJourGate(
        child: BiometrieLockWrapper(child: child ?? const SizedBox.shrink()),
      ),
    );
  }
}
