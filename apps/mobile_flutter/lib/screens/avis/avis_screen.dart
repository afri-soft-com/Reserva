import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../theme.dart';
import '../../models/models.dart';
import '../../services/api_avis.dart';
import '../../services/api_client.dart';
import '../../services/api_reservations.dart';
import '../../widgets/carte.dart';
import '../../widgets/bouton.dart';
import '../../widgets/toast.dart';

class AvisScreen extends StatefulWidget {
  final String reservationId;
  const AvisScreen({super.key, required this.reservationId});

  @override
  State<AvisScreen> createState() => _AvisScreenState();
}

class _AvisScreenState extends State<AvisScreen> {
  ReservationDetaillee? _detail;
  bool _chargement = true;
  bool _envoi = false;
  int _note = 5;
  final _commentaireCtrl = TextEditingController();
  final List<String> _photos = [];

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final detail = await ApiReservations.obtenirDetail(widget.reservationId);
      if (mounted) setState(() => _detail = detail);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _ajouterPhoto() async {
    if (_photos.length >= 5) {
      if (mounted) ToastWidget.show(context, 'Maximum 5 photos par avis', type: 'erreur');
      return;
    }
    try {
      final fichier = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1600, imageQuality: 80);
      if (fichier != null) {
        if (mounted) setState(() => _photos.add(fichier.path));
      }
    } catch (_) {
      if (mounted) ToastWidget.show(context, 'Impossible d\'accéder à la galerie', type: 'erreur');
    }
  }

  Future<void> _soumettre() async {
    setState(() => _envoi = true);
    try {
      List<String> photosUrl = [];
      for (final chemin in _photos) {
        final url = await ApiClient.uploadImage(chemin);
        photosUrl.add(url);
      }
      await ApiAvis.creerAvis(
        reservationId: widget.reservationId,
        note: _note,
        commentaire: _commentaireCtrl.text,
        photosUrl: photosUrl,
      );
      if (mounted) {
        ToastWidget.show(context, 'Avis publié avec succès.', type: 'succes');
        context.pop(true);
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_detail == null) return const Scaffold(body: Center(child: Text('Réservation non trouvée')));

    final r = _detail!;

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Donner mon avis')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Carte(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: AppCouleurs.primaireClair,
                    child: Icon(Icons.person, size: 32, color: AppCouleurs.primaire),
                  ),
                  const SizedBox(height: 12),
                  Text(r.prestataire.nomEntreprise,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(r.service.nom,
                    style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('Votre note', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(5, (i) {
                  final etoile = i + 1;
                  return IconButton(
                    icon: Icon(
                      etoile <= _note ? Icons.star : Icons.star_border,
                      color: AppCouleurs.accent,
                      size: 40,
                    ),
                    onPressed: () => setState(() => _note = etoile),
                  );
                }),
              ),
            ),
            const SizedBox(height: 20),
            const Text('Commentaire (optionnel)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _commentaireCtrl,
              maxLines: 4,
              maxLength: 1000,
              decoration: InputDecoration(
                hintText: 'Partagez votre expérience...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRayons.champ)),
                filled: true, fillColor: AppCouleurs.fondChamp,
              ),
            ),
            const SizedBox(height: 24),
            const Text('Ajouter des photos (optionnel)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                ..._photos.map((p) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(File(p), width: 64, height: 64, fit: BoxFit.cover),
                      ),
                      Positioned(
                        top: 0, right: 0,
                        child: GestureDetector(
                          onTap: () => setState(() => _photos.remove(p)),
                          child: Container(
                            decoration: const BoxDecoration(
                              color: Colors.black54,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.close, size: 14, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
                if (_photos.length < 5)
                  GestureDetector(
                    onTap: _ajouterPhoto,
                    child: Container(
                      width: 64, height: 64,
                      decoration: BoxDecoration(
                        color: AppCouleurs.fondChamp,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppCouleurs.bordure),
                      ),
                      child: const Icon(Icons.add_a_photo, color: AppCouleurs.texteSecondaire, size: 24),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 24),
            Bouton(
              titre: 'Publier mon avis',
              onPressed: _envoi ? null : _soumettre,
              chargement: _envoi,
              icone: Icons.send,
            ),
          ],
        ),
      ),
    );
  }
}
