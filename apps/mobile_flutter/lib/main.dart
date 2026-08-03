import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/langue_provider.dart';
import 'router.dart';
import 'theme.dart';
import 'widgets/biometrie_lock.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..initialiser()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()..initialiser()),
        ChangeNotifierProvider(create: (_) => LangueProvider()..initialiser()),
      ],
      child: const ReservaApp(),
    ),
  );
}

class ReservaApp extends StatelessWidget {
  const ReservaApp({super.key});

  @override
  Widget build(BuildContext context) {
    final router = createRouter(context.watch<AuthProvider>());
    final themeProvider = context.watch<ThemeProvider>();
    return MaterialApp.router(
      title: 'RESERVA',
      debugShowCheckedModeBanner: false,
      theme: appTheme(),
      darkTheme: appThemeSombre(),
      themeMode: themeProvider.initialise ? themeProvider.mode : ThemeMode.light,
      routerConfig: router,
      builder: (context, child) => BiometrieLockWrapper(child: child!),
    );
  }
}
