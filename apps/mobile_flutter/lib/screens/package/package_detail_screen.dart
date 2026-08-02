import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../theme.dart';
import '../../services/api_packages.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/carte.dart';
import '../../widgets/bouton.dart';
import '../../widgets/toast.dart';
import '../../widgets/squelette.dart';

class PackageDetailScreen extends StatefulWidget {
  final String packageId;
  const PackageDetailScreen({super.key, required this.packageId});

  @override
  State<PackageDetailScreen> createState() => _PackageDetailScreenState();
}

class _PackageDetailScreenState extends State<PackageDetailScreen> {
  Map<String, dynamic>? _data;
  bool _chargement = true;
  bool _reservationEnCours = false;

  // serviceId -> creneau sélectionné
  final Map<String, String> _selectionCreneaux = {};
  // serviceId -> inclus dans la réservation
  final Map<String, bool> _inclusion = {};
  // serviceId -> note libre
  final Map<String, TextEditingController> _notesCtrls = {};

  @override
  void initState() {
    super.initState();
    _charger();
  }

  @override
  void dispose() {
    for (final c in _notesCtrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  List<Map<String, dynamic>> get _services {
    final items = _data?['services'] as List<dynamic>? ?? [];
    return items.map((i) {
      final item = i as Map<String, dynamic>;
      return item['service'] as Map<String, dynamic>;
    }).toList();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final data = await ApiPackages.detailPublic(widget.packageId);
      if (!mounted) return;
      setState(() {
        _data = data;
        _initialiserSelections();
      });
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  void _initialiserSelections() {
    for (final s in _services) {
      final serviceId = s['id'] as String?;
      if (serviceId == null) continue;
      final creneaux = _creneauxDisponibles(s);
      if (creneaux.isNotEmpty) {
        _selectionCreneaux[serviceId] = creneaux.first['id'] as String;
        _inclusion[serviceId] = true;
      } else {
        _inclusion[serviceId] = false;
      }
      _notesCtrls[serviceId] = TextEditingController();
    }
  }

  List<dynamic> _creneauxDisponibles(Map<String, dynamic> service) {
    final creneaux = (service['creneaux'] as List<dynamic>?) ?? [];
    return creneaux.where((c) {
      final cr = c as Map<String, dynamic>;
      final total = (cr['capaciteTotale'] as num?)?.toInt() ?? 0;
      final reservee = (cr['capaciteReservee'] as num?)?.toInt() ?? 0;
      return reservee < total;
    }).toList();
  }

  String _formaterMontant(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  String _formaterCreneau(String iso) {
    final date = iso.substring(0, 10);
    final debut = iso.substring(11, 16);
    return '$date $debut';
  }

  double get _totalReservation {
    var total = 0.0;
    for (final s in _services) {
      final serviceId = s['id'] as String?;
      if (serviceId == null || _inclusion[serviceId] != true) continue;
      total += (s['prix'] as num?)?.toDouble() ?? 0;
    }
    return total;
  }

  int get _nbSelectionnes => _services.where((s) => _inclusion[s['id']] == true).length;

  Future<void> _reserver() async {
    final auth = context.read<AuthProvider>();
    if (auth.estPrestataire) {
      ToastWidget.show(context, 'Seuls les clients peuvent effectuer une réservation.', type: 'erreur');
      return;
    }

    final items = <Map<String, String>>[];
    final manquants = <String>[];
    for (final s in _services) {
      final serviceId = s['id'] as String?;
      if (serviceId == null || _inclusion[serviceId] != true) continue;
      final creneauId = _selectionCreneaux[serviceId];
      if (creneauId == null) {
        manquants.add(s['nom'] as String? ?? 'Service');
        continue;
      }
      items.add({
        'serviceId': serviceId,
        'creneauId': creneauId,
        'notes': _notesCtrls[serviceId]?.text.trim() ?? '',
      });
    }

    if (items.isEmpty) {
      ToastWidget.show(context, 'Sélectionnez au moins un service avec un créneau.', type: 'erreur');
      return;
    }
    if (manquants.isNotEmpty) {
      ToastWidget.show(context, 'Choisissez un créneau pour : ${manquants.join(', ')}', type: 'erreur');
      return;
    }

    setState(() => _reservationEnCours = true);
    try {
      final resultat = await ApiPackages.reserverPackage(
        packageId: widget.packageId,
        items: items,
      );
      final nb = (resultat['reservations'] as List<dynamic>? ?? []).length;
      if (mounted) {
        ToastWidget.show(context, 'Package réservé ! $nb réservation(s) créée(s).', type: 'succes');
        context.go('/reservations');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _reservationEnCours = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) {
      return Scaffold(
        backgroundColor: AppCouleurs.fond,
        appBar: AppBar(title: const Text('Package')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: const [CarteSquelette(), SizedBox(height: 16), CarteSquelette()],
        ),
      );
    }

    if (_data == null) {
      return Scaffold(
        backgroundColor: AppCouleurs.fond,
        appBar: AppBar(title: const Text('Package')),
        body: const Center(child: Text('Package non trouvé')),
      );
    }

    final prestataire = _data?['prestataire'] as Map<String, dynamic>? ?? {};
    final auth = context.watch<AuthProvider>();
    final services = _services;

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: Text(_data?['nom'] as String? ?? 'Package')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Carte(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_data?['nom'] as String? ?? 'Package',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppCouleurs.texte)),
                if (prestataire.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(children: [
                    const Icon(Icons.business, size: 16, color: AppCouleurs.texteSecondaire),
                    const SizedBox(width: 4),
                    Expanded(child: Text(prestataire['nomEntreprise'] as String? ?? '',
                      style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire))),
                  ]),
                ],
                const SizedBox(height: 10),
                Text(_formaterMontant((_data?['prix'] as num?)?.toDouble() ?? 0, _data?['devise'] as String? ?? 'CDF'),
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
                if (_data?['description'] != null && (_data?['description'] as String).isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(_data?['description'] as String,
                    style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text('Composez votre réservation', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          if (services.isEmpty)
            const Carte(child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Ce package ne contient aucun service', style: TextStyle(color: AppCouleurs.texteSecondaire)),
            ))
          else
            ...services.map((s) => _buildServiceCarte(s)),
          if (!auth.estPrestataire) ...[
            const SizedBox(height: 16),
            if (_nbSelectionnes > 0) ...[
              Text(
                'Total à régler : ${_formaterMontant(_totalReservation, _data?['devise'] as String? ?? 'CDF')}',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppCouleurs.texte),
              ),
              const SizedBox(height: 8),
            ],
            Bouton(
              titre: _nbSelectionnes > 0
                  ? 'Réserver le package ($_nbSelectionnes réservation${_nbSelectionnes > 1 ? 's' : ''})'
                  : 'Réserver le package',
              onPressed: _reserver,
              chargement: _reservationEnCours,
            ),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildServiceCarte(Map<String, dynamic> service) {
    final serviceId = service['id'] as String? ?? '';
    final creneaux = _creneauxDisponibles(service);
    final inclus = _inclusion[serviceId] == true;
    final selection = _selectionCreneaux[serviceId];

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Carte(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Checkbox(
                  value: inclus,
                  activeColor: AppCouleurs.primaire,
                  onChanged: (v) => setState(() => _inclusion[serviceId] = v ?? false),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(service['nom'] as String? ?? 'Service',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      const SizedBox(height: 2),
                      Text(_formaterMontant((service['prix'] as num?)?.toDouble() ?? 0, service['devise'] as String? ?? 'CDF'),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCouleurs.primaire)),
                    ],
                  ),
                ),
              ],
            ),
            if (!inclus)
              const Padding(
                padding: EdgeInsets.only(left: 44, bottom: 8),
                child: Text('Service exclu de la réservation', style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
              )
            else if (creneaux.isEmpty)
              const Padding(
                padding: EdgeInsets.only(left: 44, bottom: 8),
                child: Text('Aucun créneau disponible', style: TextStyle(fontSize: 12, color: AppCouleurs.alerte)),
              )
            else ...[
              Padding(
                padding: const EdgeInsets.only(left: 44, bottom: 4),
                child: DropdownButton<String>(
                  value: selection,
                  isExpanded: true,
                  isDense: true,
                  underline: const SizedBox(),
                  hint: const Text('Choisir un créneau', style: TextStyle(fontSize: 13)),
                  items: creneaux.map<DropdownMenuItem<String>>((c) {
                    final cr = c as Map<String, dynamic>;
                    return DropdownMenuItem(
                      value: cr['id'] as String,
                      child: Text(_formaterCreneau(cr['debut'] as String),
                        style: const TextStyle(fontSize: 13)),
                    );
                  }).toList(),
                  onChanged: (v) => setState(() => _selectionCreneaux[serviceId] = v!),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(left: 44, bottom: 4),
                child: TextField(
                  controller: _notesCtrls[serviceId],
                  decoration: const InputDecoration(
                    hintText: 'Note pour ce service (optionnel)',
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                  style: const TextStyle(fontSize: 13),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
