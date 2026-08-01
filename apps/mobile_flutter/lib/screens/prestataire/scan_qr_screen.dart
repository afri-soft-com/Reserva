import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../theme.dart';
import '../../models/models.dart';
import '../../services/api_prestataire.dart';
import '../../widgets/carte.dart';
import '../../widgets/badge_statut.dart';
import '../../widgets/toast.dart';

class ScanQrScreen extends StatefulWidget {
  const ScanQrScreen({super.key});

  @override
  State<ScanQrScreen> createState() => _ScanQrScreenState();
}

class _ScanQrScreenState extends State<ScanQrScreen> {
  final MobileScannerController _scannerCtrl = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
  );
  final _numeroCtrl = TextEditingController();
  bool _verrouille = false;
  bool _chargement = false;
  Map<String, dynamic>? _reservation;
  String? _erreur;

  @override
  void dispose() {
    _scannerCtrl.dispose();
    _numeroCtrl.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_verrouille) return;
    final code = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
    if (code == null || code.isEmpty) return;
    setState(() => _verrouille = true);
    _rechercher(code.trim());
  }

  Future<void> _rechercher(String valeur) async {
    setState(() {
      _chargement = true;
      _erreur = null;
      _reservation = null;
    });
    try {
      // Le QR encode le numéro (RSV-...). Fallback : l'identifiant UUID de la réservation.
      final estUuid = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$').hasMatch(valeur);
      final data = estUuid
          ? await ApiPrestataire.obtenirDetailReservationParId(valeur)
          : await ApiPrestataire.obtenirReservationParNumero(valeur);
      if (mounted) setState(() => _reservation = data);
    } catch (e) {
      if (mounted) setState(() => _erreur = e.toString());
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _entamer(String reservationId) async {
    setState(() => _chargement = true);
    try {
      await ApiPrestataire.entamerReservation(reservationId);
      if (mounted) {
        ToastWidget.show(context, 'Prestation démarrée', type: 'succes');
        await _rechercher(reservationId);
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _cloturer(String reservationId, String statut) async {
    setState(() => _chargement = true);
    try {
      await ApiPrestataire.cloturerReservation(reservationId, statut: statut);
      if (mounted) {
        ToastWidget.show(context, statut == 'TERMINEE' ? 'Réservation terminée' : 'Marquée comme absence', type: 'succes');
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  void _reinitialiser() {
    setState(() {
      _verrouille = false;
      _reservation = null;
      _erreur = null;
    });
    _scannerCtrl.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1B2A),
      appBar: AppBar(
        title: const Text('Scanner une réservation'),
        backgroundColor: const Color(0xFF0D1B2A),
        foregroundColor: AppCouleurs.blanc,
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (_reservation == null)
              Expanded(
                child: Stack(
                  children: [
                    MobileScanner(
                      controller: _scannerCtrl,
                      onDetect: _onDetect,
                    ),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      color: const Color(0xFF0D1B2A).withValues(alpha: 0.7),
                      child: const Text(
                        'Scannez le QR code affiché par votre client dans sa réservation.',
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    if (_chargement)
                      Container(
                        color: Colors.black54,
                        child: const Center(child: CircularProgressIndicator(color: Colors.white)),
                      ),
                  ],
                ),
              )
            else
              Expanded(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  color: AppCouleurs.fond,
                  child: SingleChildScrollView(
                    child: _buildResultat(),
                  ),
                ),
              ),
            if (_reservation == null && _erreur != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.all(12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppCouleurs.alerte.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppCouleurs.alerte, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_erreur!, style: const TextStyle(fontSize: 13, color: AppCouleurs.alerte)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.replay, size: 20, color: AppCouleurs.alerte),
                      onPressed: _reinitialiser,
                    ),
                  ],
                ),
              ),
            if (_reservation == null)
              Container(
                padding: const EdgeInsets.all(12),
                color: const Color(0xFF0D1B2A),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _numeroCtrl,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        textCapitalization: TextCapitalization.characters,
                        decoration: InputDecoration(
                          hintText: 'Numéro manuel (ex: RSV-ABC123)',
                          hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
                          filled: true,
                          fillColor: Colors.white12,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide.none,
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: _numeroCtrl.text.trim().isEmpty
                          ? null
                          : () {
                              setState(() => _verrouille = true);
                              _rechercher(_numeroCtrl.text.trim());
                            },
                      icon: const Icon(Icons.search, color: Colors.white),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultat() {
    if (_chargement) {
      return const Center(child: CircularProgressIndicator());
    }
    final r = _reservation!;
    final statut = r['statut'] as String? ?? '';
    final client = r['client'] as Map<String, dynamic>? ?? {};
    final service = r['service'] as Map<String, dynamic>? ?? {};
    final creneau = r['creneau'] as Map<String, dynamic>? ?? {};
    final nomClient = (r['reservePourTiers'] as bool? ?? false)
        ? (r['nomTiers'] as String? ?? 'Réservation pour tiers')
        : (client['nom'] as String? ?? 'Client');
    final debut = creneau['debut'] as String? ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text('Réservation trouvée', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            ),
            IconButton(
              onPressed: _reinitialiser,
              icon: const Icon(Icons.qr_code_scanner),
              tooltip: 'Scanner à nouveau',
            ),
          ],
        ),
        Carte(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(r['numero'] as String? ?? '',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, letterSpacing: 1)),
                  BadgeStatut(statut: statut),
                ],
              ),
              const SizedBox(height: 12),
              _ligne(Icons.person, 'Client', nomClient),
              const SizedBox(height: 6),
              _ligne(Icons.miscellaneous_services, 'Service', service['nom'] as String? ?? ''),
              if (debut.isNotEmpty) ...[
                const SizedBox(height: 6),
                _ligne(Icons.access_time, 'Horaire', debut.substring(0, 16).replaceAll('T', ' ')),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (statut == StatutReservation.confirmee) ...[
          SizedBox(
            width: double.infinity, height: 46,
            child: ElevatedButton.icon(
              onPressed: _chargement ? null : () => _entamer(r['id'] as String),
              icon: const Icon(Icons.play_arrow),
              label: const Text('Démarrer la prestation'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCouleurs.primaire,
                foregroundColor: AppCouleurs.blanc,
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text('La réservation passera à l\'état "En cours".', style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
        ],
        if (statut == StatutReservation.enCours) ...[
          SizedBox(
            width: double.infinity, height: 46,
            child: ElevatedButton.icon(
              onPressed: _chargement ? null : () => _cloturer(r['id'] as String, 'TERMINEE'),
              icon: const Icon(Icons.task_alt),
              label: const Text('Clôturer — terminée'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCouleurs.succes,
                foregroundColor: AppCouleurs.blanc,
              ),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity, height: 46,
            child: ElevatedButton.icon(
              onPressed: _chargement ? null : () => _cloturer(r['id'] as String, 'ABSENCE'),
              icon: const Icon(Icons.person_off),
              label: const Text('Clôturer — absence'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCouleurs.alerte,
                foregroundColor: AppCouleurs.blanc,
              ),
            ),
          ),
        ],
        if (statut == StatutReservation.terminee || statut == StatutReservation.absence)
          const Text('Cette réservation est déjà clôturée.', style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
        if (statut == StatutReservation.enAttente)
          const Text('Cette réservation est en attente de confirmation.', style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
        if (statut == StatutReservation.annulee || statut == StatutReservation.refusee)
          const Text('Cette réservation est annulée ou refusée.', style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
      ],
    );
  }

  Widget _ligne(IconData icone, String label, String valeur) {
    return Row(
      children: [
        Icon(icone, size: 16, color: AppCouleurs.texteSecondaire),
        const SizedBox(width: 8),
        Text('$label : ', style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
        Expanded(child: Text(valeur, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
      ],
    );
  }
}
