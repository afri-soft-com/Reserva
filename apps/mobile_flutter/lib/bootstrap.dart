import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'app_flavor.dart';
import 'providers/auth_provider.dart';
import 'providers/langue_provider.dart';
import 'providers/theme_provider.dart';
import 'router.dart';
import 'theme.dart';

Future<void> demarrerApp({required AppFlavor roleForce}) async {
  WidgetsFlutterBinding.ensureInitialized();
  AppFlavorConfig.initialiser(roleForce);
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  final auth = AuthProvider();
  await auth.initialiser();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: auth),
        ChangeNotifierProvider(create: (_) => LangueProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: ReservaApp(auth: auth),
    ),
  );
}

class ReservaApp extends StatelessWidget {
  final AuthProvider auth;
  const ReservaApp({super.key, required this.auth});

  @override
  Widget build(BuildContext context) {
    final router = createRouter(auth);
    return MaterialApp.router(
      title: AppFlavorConfig.nomApp,
      debugShowCheckedModeBanner: false,
      theme: appTheme(),
      routerConfig: router,
    );
  }
}
