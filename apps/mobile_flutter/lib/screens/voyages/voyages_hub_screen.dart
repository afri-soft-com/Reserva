import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';

class VoyagesHubScreen extends StatelessWidget {
  const VoyagesHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Voyages')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _tuile(
              context,
              Icons.hotel,
              'Hôtels',
              'Dates, chambres, annulation — style Booking',
              () => context.push('/hotels'),
            ),
            const SizedBox(height: 12),
            _tuile(
              context,
              Icons.directions_bus,
              'Bus & trajets',
              'Origine → destination — style Trip',
              () => context.push('/transport'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tuile(BuildContext context, IconData icon, String titre, String sous, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppCouleurs.blanc,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: const BoxDecoration(color: AppCouleurs.primaireClair, shape: BoxShape.circle),
              child: Icon(icon, color: AppCouleurs.primaire),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(titre, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  Text(sous, style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right),
          ],
        ),
      ),
    );
  }
}
