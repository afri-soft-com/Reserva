import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../models/models.dart';
import '../../services/api_services.dart';
import '../../services/api_reservations.dart';
import '../../widgets/carte.dart';
import '../../widgets/bouton.dart';
import '../../widgets/toast.dart';

class ModifierReservationScreen extends StatefulWidget {
  final ReservationDetaillee detail;
  const ModifierReservationScreen({super.key, required this.detail});

  @override
  State<ModifierReservationScreen> createState() => _ModifierReservationScreenState();
}

class _ModifierReservationScreenState extends State<ModifierReservationScreen> {
  List<Creneau> _creneaux = [];
  String? _selectedCreneauId;
  bool _chargement = true;
  bool _envoi = false;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final data = await ApiServices.obtenirDetailService(widget.detail.service.id);
      final creneaux = (data['creneaux'] as List<dynamic>?)
          ?.map((c) => Creneau.fromJson(c as Map<String, dynamic>))
          .where((c) => c.disponible && c.id != widget.detail.creneau.id)
          .toList() ?? [];
      if (mounted) setState(() => _creneaux = creneaux);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _modifier() async {
    if (_selectedCreneauId == null) {
      ToastWidget.show(context, 'Veuillez sélectionner un nouveau créneau.', type: 'erreur');
      return;
    }
    setState(() => _envoi = true);
    try {
      await ApiReservations.modifierReservation(widget.detail.reservation.id, _selectedCreneauId!);
      if (mounted) {
        ToastWidget.show(context, 'Réservation modifiée avec succès.', type: 'succes');
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.detail;
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: Text('Modifier ${r.reservation.numero}')),
      body: _chargement
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Carte(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r.service.nom, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppCouleurs.texte)),
                        const SizedBox(height: 4),
                        Text('${r.prestataire.nomEntreprise} · ${r.prestataire.ville}', style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.schedule, size: 16, color: AppCouleurs.texteSecondaire),
                            const SizedBox(width: 4),
                            Expanded(child: Text('Actuel : ${r.creneau.debut.substring(11, 16)} - ${r.creneau.fin.substring(11, 16)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppCouleurs.alerte))),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text('Nouveau créneau', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  if (_creneaux.isEmpty && !_chargement)
                    const Carte(child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('Aucun autre créneau disponible pour ce service.', style: TextStyle(color: AppCouleurs.texteSecondaire)),
                    ))
                  else
                    ...List.generate(_creneaux.length, (i) => Padding(
                      padding: EdgeInsets.only(bottom: i < _creneaux.length - 1 ? 8 : 0),
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedCreneauId = _creneaux[i].id),
                        child: Carte(
                          child: Row(
                            children: [
                              Radio<String>(
                                value: _creneaux[i].id,
                                groupValue: _selectedCreneauId,
                                onChanged: (v) => setState(() => _selectedCreneauId = v),
                                activeColor: AppCouleurs.primaire,
                              ),
                              const SizedBox(width: 8),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${_creneaux[i].debut.substring(11, 16)} - ${_creneaux[i].fin.substring(11, 16)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                                  Text('Places: ${_creneaux[i].capaciteTotale - _creneaux[i].capaciteReservee}/${_creneaux[i].capaciteTotale}', style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    )),
                  if (_creneaux.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Bouton(titre: 'Confirmer le changement', onPressed: _modifier, chargement: _envoi),
                  ],
                ],
              ),
            ),
    );
  }
}
