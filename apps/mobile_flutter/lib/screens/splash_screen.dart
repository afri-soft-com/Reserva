import 'package:flutter/material.dart';
import '../theme.dart';

class SplashScreen extends StatefulWidget {
  final VoidCallback onTermine;

  const SplashScreen({super.key, required this.onTermine});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _echelle;
  late Animation<double> _rotation;
  late Animation<double> _opacite;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 2200));
    _echelle = Tween<double>(begin: 0.3, end: 1.0).animate(CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.4, curve: Curves.elasticOut),
    ));
    _rotation = Tween<double>(begin: -0.5, end: 0.0).animate(CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.5, curve: Curves.easeOutBack),
    ));
    _opacite = Tween<double>(begin: 1.0, end: 0.0).animate(CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.8, 1.0, curve: Curves.easeOut),
    ));

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) widget.onTermine();
    });

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacite,
      child: Container(
        color: AppCouleurs.primaire,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              RotationTransition(
                turns: _rotation,
                child: ScaleTransition(
                  scale: _echelle,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Image.asset('assets/icon.png', width: 96, height: 96, fit: BoxFit.cover),
                  ),
                ),
              ),
              const SizedBox(height: 28),
              const Text('RESERVA', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 3)),
              const SizedBox(height: 6),
              Text('Réservez. Sereinement.', style: TextStyle(fontSize: 15, color: AppCouleurs.primaireClair, letterSpacing: 0.5)),
              const SizedBox(height: 48),
              const SizedBox(
                width: 22, height: 22,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white70),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
