import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../theme.dart';

class QrCodeReservation extends StatelessWidget {
  final String reservationId;
  final String numero;
  final String statut;
  final String service;
  final String prestataire;

  const QrCodeReservation({
    super.key,
    required this.reservationId,
    required this.numero,
    required this.statut,
    required this.service,
    required this.prestataire,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showFullScreen(context),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('QR Code', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppCouleurs.primaireClair,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(statut, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppCouleurs.primaire)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              QrImageView(
                data: numero,
                version: QrVersions.auto,
                size: 140,
                eyeStyle: QrEyeStyle(color: AppCouleurs.primaireFonce),
                dataModuleStyle: QrDataModuleStyle(color: AppCouleurs.primaireFonce),
              ),
              const SizedBox(height: 8),
              Text(numero,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 1)),
              const SizedBox(height: 4),
              Text('Tapez pour agrandir',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
            ],
          ),
        ),
      ),
    );
  }

  void _showFullScreen(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(
            title: const Text('QR Code'),
            backgroundColor: Colors.white,
            foregroundColor: AppCouleurs.texte,
          ),
          body: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                QrImageView(
                  data: numero,
                  version: QrVersions.auto,
                  size: 280,
                  eyeStyle: QrEyeStyle(color: AppCouleurs.primaireFonce),
                  dataModuleStyle: QrDataModuleStyle(color: AppCouleurs.primaireFonce),
                ),
                const SizedBox(height: 24),
                Text(numero,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 2)),
                const SizedBox(height: 8),
                Text(service,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(prestataire,
                    style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
