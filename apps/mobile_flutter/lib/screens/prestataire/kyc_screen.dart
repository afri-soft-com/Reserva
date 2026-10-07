import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../theme.dart';
import '../../models/enums.dart';
import '../../services/api_client.dart';
import '../../services/api_prestataire.dart';
import '../../widgets/toast.dart';

class KycScreen extends StatefulWidget {
  const KycScreen({super.key});

  @override
  State<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends State<KycScreen> {
  bool _chargement = true;
  bool _envoi = false;
  Map<String, dynamic>? _kyc;

  final _numeroCtrl = TextEditingController();
  final _rccmCtrl = TextEditingController();
  final _nifCtrl = TextEditingController();
  final _adresseCtrl = TextEditingController();
  String? _typePiece;

  String? _rectoUrl;
  String? _versoUrl;
  String? _selfieUrl;
  String? _rccmDocUrl;
  String? _nifDocUrl;
  String? _attestationUrl;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  @override
  void dispose() {
    _numeroCtrl.dispose();
    _rccmCtrl.dispose();
    _nifCtrl.dispose();
    _adresseCtrl.dispose();
    super.dispose();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final data = await ApiPrestataire.obtenirKyc();
      if (!mounted) return;
      setState(() {
        _kyc = data;
        _typePiece = data['pieceIdentiteType'] as String?;
        _numeroCtrl.text = data['pieceIdentiteNumero'] as String? ?? '';
        _rccmCtrl.text = data['rccm'] as String? ?? '';
        _nifCtrl.text = data['nif'] as String? ?? '';
        _adresseCtrl.text = data['adresseLegale'] as String? ?? '';
        _rectoUrl = data['pieceIdentiteRectoUrl'] as String?;
        _versoUrl = data['pieceIdentiteVersoUrl'] as String?;
        _selfieUrl = data['selfieUrl'] as String?;
        _rccmDocUrl = data['documentRccmUrl'] as String?;
        _nifDocUrl = data['documentNifUrl'] as String?;
        _attestationUrl = data['attestationUrl'] as String?;
      });
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  bool get _peutModifier => _kyc?['peutModifier'] == true;

  String _libelleStatut(String? s) {
    switch (s) {
      case StatutKyc.brouillon:
        return 'Brouillon';
      case StatutKyc.enRevue:
        return 'En revue';
      case StatutKyc.infoManquante:
        return 'Infos manquantes';
      case StatutKyc.valide:
        return 'Validé';
      case StatutKyc.refuse:
        return 'Refusé';
      default:
        return s ?? '—';
    }
  }

  Color _couleurStatut(String? s) {
    switch (s) {
      case StatutKyc.valide:
        return AppCouleurs.succes;
      case StatutKyc.enRevue:
        return AppCouleurs.avertissement;
      case StatutKyc.infoManquante:
        return AppCouleurs.accent;
      case StatutKyc.refuse:
        return AppCouleurs.alerte;
      default:
        return AppCouleurs.texteSecondaire;
    }
  }

  Future<String?> _uploader(ImageSource source) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, imageQuality: 85, maxWidth: 1600);
    if (file == null) return null;
    return ApiClient.uploadImage(file.path);
  }

  Future<void> _choisirImage(void Function(String url) onUrl) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera),
              title: const Text('Appareil photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Galerie'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;
    try {
      final url = await _uploader(source);
      if (url != null && mounted) {
        setState(() => onUrl(url));
        ToastWidget.show(context, 'Document téléversé', type: 'succes');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    }
  }

  Future<void> _enregistrer() async {
    if (!_peutModifier) return;
    setState(() => _envoi = true);
    try {
      final data = await ApiPrestataire.mettreAJourKyc({
        'pieceIdentiteType': _typePiece,
        'pieceIdentiteNumero': _numeroCtrl.text.trim().isEmpty ? null : _numeroCtrl.text.trim(),
        'pieceIdentiteRectoUrl': _rectoUrl,
        'pieceIdentiteVersoUrl': _versoUrl,
        'selfieUrl': _selfieUrl,
        'rccm': _rccmCtrl.text.trim().isEmpty ? null : _rccmCtrl.text.trim(),
        'nif': _nifCtrl.text.trim().isEmpty ? null : _nifCtrl.text.trim(),
        'adresseLegale': _adresseCtrl.text.trim().isEmpty ? null : _adresseCtrl.text.trim(),
        'documentRccmUrl': _rccmDocUrl,
        'documentNifUrl': _nifDocUrl,
        'attestationUrl': _attestationUrl,
      });
      if (!mounted) return;
      setState(() => _kyc = data);
      ToastWidget.show(context, 'Brouillon KYC enregistré', type: 'succes');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  Future<void> _soumettre() async {
    if (!_peutModifier) return;
    setState(() => _envoi = true);
    try {
      await ApiPrestataire.mettreAJourKyc({
        'pieceIdentiteType': _typePiece,
        'pieceIdentiteNumero': _numeroCtrl.text.trim().isEmpty ? null : _numeroCtrl.text.trim(),
        'pieceIdentiteRectoUrl': _rectoUrl,
        'pieceIdentiteVersoUrl': _versoUrl,
        'selfieUrl': _selfieUrl,
        'rccm': _rccmCtrl.text.trim().isEmpty ? null : _rccmCtrl.text.trim(),
        'nif': _nifCtrl.text.trim().isEmpty ? null : _nifCtrl.text.trim(),
        'adresseLegale': _adresseCtrl.text.trim().isEmpty ? null : _adresseCtrl.text.trim(),
        'documentRccmUrl': _rccmDocUrl,
        'documentNifUrl': _nifDocUrl,
        'attestationUrl': _attestationUrl,
      });
      final data = await ApiPrestataire.soumettreKyc();
      if (!mounted) return;
      setState(() => _kyc = data);
      ToastWidget.show(context, 'Dossier soumis pour revue', type: 'succes');
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  Widget _docTile({
    required String titre,
    required String? url,
    required void Function(String) onUrl,
    required bool obligatoire,
  }) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(
        url != null ? Icons.check_circle : Icons.upload_file,
        color: url != null ? AppCouleurs.succes : AppCouleurs.texteSecondaire,
      ),
      title: Text(titre, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      subtitle: Text(
        url != null ? 'Document prêt' : (obligatoire ? 'Requis' : 'Optionnel'),
        style: TextStyle(fontSize: 12, color: url != null ? AppCouleurs.succes : AppCouleurs.texteSecondaire),
      ),
      trailing: _peutModifier
          ? TextButton(onPressed: () => _choisirImage(onUrl), child: Text(url != null ? 'Remplacer' : 'Ajouter'))
          : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) {
      return Scaffold(
        appBar: AppBar(title: const Text('Vérification KYC')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final statut = _kyc?['kycStatut'] as String?;
    final checklist = _kyc?['checklist'] as Map<String, dynamic>? ?? {};
    final manquants = (checklist['manquants'] as List?)?.cast<String>() ?? [];
    final motif = _kyc?['kycMotifRejet'] as String?;

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Vérification KYC')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppCouleurs.blanc,
              borderRadius: BorderRadius.circular(AppRayons.carte),
              border: Border.all(color: AppCouleurs.bordure),
            ),
            child: Row(
              children: [
                Icon(Icons.verified_user, color: _couleurStatut(statut)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Statut du dossier', style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                      Text(_libelleStatut(statut),
                          style: TextStyle(fontWeight: FontWeight.w700, color: _couleurStatut(statut))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (motif != null && motif.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppCouleurs.alerte.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(motif, style: const TextStyle(color: AppCouleurs.alerte, fontSize: 13)),
            ),
          ],
          const SizedBox(height: 20),
          const Text('1. Identité', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _typePiece,
            decoration: const InputDecoration(labelText: 'Type de pièce', border: OutlineInputBorder()),
            items: const [
              DropdownMenuItem(value: TypePieceIdentite.cni, child: Text('CNI')),
              DropdownMenuItem(value: TypePieceIdentite.passeport, child: Text('Passeport')),
              DropdownMenuItem(value: TypePieceIdentite.permis, child: Text('Permis')),
            ],
            onChanged: _peutModifier ? (v) => setState(() => _typePiece = v) : null,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _numeroCtrl,
            enabled: _peutModifier,
            decoration: const InputDecoration(labelText: 'Numéro de pièce', border: OutlineInputBorder()),
          ),
          _docTile(
            titre: 'Photo recto',
            url: _rectoUrl,
            onUrl: (u) => _rectoUrl = u,
            obligatoire: true,
          ),
          if (_typePiece != TypePieceIdentite.passeport)
            _docTile(
              titre: 'Photo verso',
              url: _versoUrl,
              onUrl: (u) => _versoUrl = u,
              obligatoire: true,
            ),
          _docTile(
            titre: 'Selfie de vérification',
            url: _selfieUrl,
            onUrl: (u) => _selfieUrl = u,
            obligatoire: true,
          ),
          const SizedBox(height: 16),
          const Text('2. Entreprise', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(
            controller: _rccmCtrl,
            enabled: _peutModifier,
            decoration: const InputDecoration(labelText: 'RCCM', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _nifCtrl,
            enabled: _peutModifier,
            decoration: const InputDecoration(labelText: 'NIF', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _adresseCtrl,
            enabled: _peutModifier,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Adresse légale', border: OutlineInputBorder()),
          ),
          _docTile(
            titre: 'Document RCCM',
            url: _rccmDocUrl,
            onUrl: (u) => _rccmDocUrl = u,
            obligatoire: false,
          ),
          _docTile(
            titre: 'Document NIF',
            url: _nifDocUrl,
            onUrl: (u) => _nifDocUrl = u,
            obligatoire: false,
          ),
          _docTile(
            titre: 'Attestation / autre justificatif',
            url: _attestationUrl,
            onUrl: (u) => _attestationUrl = u,
            obligatoire: false,
          ),
          if (manquants.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('À compléter : ${manquants.join(' ; ')}',
                style: const TextStyle(fontSize: 12, color: AppCouleurs.avertissement)),
          ],
          const SizedBox(height: 24),
          if (_peutModifier) ...[
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _envoi ? null : _enregistrer,
                child: const Text('Enregistrer le brouillon'),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _envoi ? null : _soumettre,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppCouleurs.primaire,
                  foregroundColor: AppCouleurs.blanc,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: _envoi
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Soumettre pour validation'),
              ),
            ),
          ] else if (statut == StatutKyc.enRevue) ...[
            const Text(
              'Votre dossier est en cours de vérification par l\'équipe RESERVA.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppCouleurs.texteSecondaire),
            ),
          ] else if (statut == StatutKyc.valide) ...[
            const Text(
              'Identité vérifiée. Votre profil peut être activé.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppCouleurs.succes, fontWeight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
