import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../theme.dart';
import '../../models/models.dart';
import '../../services/api_services.dart';
import '../../services/api_reservations.dart';
import '../../services/api_packages.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/carte.dart';
import '../../widgets/bouton.dart';
import '../../widgets/toast.dart';
import '../../widgets/squelette.dart';

class ServiceDetailScreen extends StatefulWidget {
  final String serviceId;
  const ServiceDetailScreen({super.key, required this.serviceId});

  @override
  State<ServiceDetailScreen> createState() => _ServiceDetailScreenState();
}

class _ServiceDetailScreenState extends State<ServiceDetailScreen> {
  Map<String, dynamic>? _data;
  bool _chargement = true;
  String? _selectedCreneauId;
  bool _reservationEnCours = false;
  List<dynamic> _packages = [];
  bool _chargementPackages = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final data = await ApiServices.obtenirDetailService(widget.serviceId);
      if (mounted) {
        setState(() => _data = data);
        _chargerPackages((data['prestataire'] as Map<String, dynamic>?)?['id'] as String?);
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _chargerPackages(String? prestataireId) async {
    if (prestataireId == null) {
      if (mounted) setState(() => _chargementPackages = false);
      return;
    }
    try {
      final packages = await ApiPackages.listerPublics(prestataireId: prestataireId);
      if (mounted) setState(() => _packages = packages);
    } catch (_) {
      // Section packages silencieuse si l'appel échoue
    } finally {
      if (mounted) setState(() => _chargementPackages = false);
    }
  }

  Future<void> _reserver() async {
    if (_selectedCreneauId == null) {
      ToastWidget.show(context, 'Veuillez sélectionner un créneau.', type: 'erreur');
      return;
    }
    final auth = context.read<AuthProvider>();
    if (auth.estPrestataire) {
      ToastWidget.show(context, 'Seuls les clients peuvent effectuer une réservation.', type: 'erreur');
      return;
    }
    setState(() => _reservationEnCours = true);
    try {
      await ApiReservations.creerReservation(
        serviceId: widget.serviceId,
        creneauId: _selectedCreneauId!,
      );
      if (mounted) {
        ToastWidget.show(context, 'Réservation effectuée !', type: 'succes');
        context.go('/reservations');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _reservationEnCours = false);
    }
  }

  String _formaterMontant(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) {
      return Scaffold(
        backgroundColor: AppCouleurs.fond,
        appBar: AppBar(title: const Text('')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            CarteSquelette(),
            SizedBox(height: 16),
            CarteSquelette(),
            SizedBox(height: 16),
            CarteSquelette(),
          ],
        ),
      );
    }

    if (_data == null) {
      return Scaffold(
        backgroundColor: AppCouleurs.fond,
        appBar: AppBar(title: const Text('Service')),
        body: const Center(child: Text('Service non trouvé')),
      );
    }

    final service = ServiceOffert.fromJson(_data!);
    final prestataire = Prestataire.fromJson(_data!['prestataire'] as Map<String, dynamic>);
    final creneaux = (_data!['creneaux'] as List<dynamic>?)?.map((c) => Creneau.fromJson(c as Map<String, dynamic>)).toList() ?? [];
    final avisList = (_data!['avis'] as List<dynamic>?) ?? [];
    final repartitionNotes = _data!['repartitionNotes'] as Map<String, dynamic>? ?? {};
    final similaires = (_data!['servicesSimilaires'] as List<dynamic>?) ?? [];
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: Text(service.nom)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildServiceInfo(service, prestataire),
            const SizedBox(height: 16),
            _buildPackages(),
            const SizedBox(height: 16),
            _buildCreneaux(creneaux),
            const SizedBox(height: 16),
            _buildRepartitionNotes(prestataire, repartitionNotes),
            const SizedBox(height: 16),
            _buildAvis(avisList),
            if (similaires.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildServicesSimilaires(similaires),
            ],
            if (!auth.estPrestataire) ...[
              const SizedBox(height: 16),
              Bouton(titre: 'Réserver ce service', onPressed: _reserver, chargement: _reservationEnCours),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceInfo(ServiceOffert service, Prestataire prestataire) {
    return Carte(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(service.nom, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppCouleurs.texte)),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.business, size: 16, color: AppCouleurs.texteSecondaire),
              const SizedBox(width: 4),
              Expanded(child: Text(prestataire.nomEntreprise, style: const TextStyle(fontSize: 15, color: AppCouleurs.texteSecondaire))),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.location_on, size: 16, color: AppCouleurs.texteSecondaire),
              const SizedBox(width: 4),
              Expanded(child: Text('${prestataire.ville}, ${prestataire.quartier}', style: const TextStyle(fontSize: 15, color: AppCouleurs.texteSecondaire))),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.star, size: 20, color: AppCouleurs.accent),
              const SizedBox(width: 4),
              Text('${prestataire.noteMoyenne.toStringAsFixed(1)} (${prestataire.nombreAvis} avis)',
                style: const TextStyle(fontSize: 14)),
            ],
          ),
          const SizedBox(height: 12),
          Text(_formaterMontant(service.prix, service.devise),
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
          if (service.description != null && service.description!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(service.description!, style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
          ],
        ],
      ),
    );
  }

  Widget _buildPackages() {
    if (_chargementPackages) return const SizedBox.shrink();
    if (_packages.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Packages du prestataire', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        ..._packages.map((p) {
          final pack = p as Map<String, dynamic>;
          final services = (pack['services'] as List<dynamic>? ?? [])
              .map((s) => (s as Map<String, dynamic>)['service'] as Map<String, dynamic>? ?? {})
              .toList();
          final nom = pack['nom'] as String? ?? 'Package';
          final prix = (pack['prix'] as num?)?.toDouble() ?? 0;
          final devise = pack['devise'] as String? ?? 'CDF';
          final description = pack['description'] as String?;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: () => _showDetailPackage(context, pack),
              borderRadius: BorderRadius.circular(14),
              child: Carte(
                child: Row(
                  children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppCouleurs.primaire, AppCouleurs.primaireClair],
                          begin: Alignment.topLeft, end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.inventory_2, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(nom, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          if (description != null && description.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(description, maxLines: 1, overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                          ],
                          const SizedBox(height: 2),
                          Text('${services.length} service(s) inclus',
                            style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(_formaterMontant(prix, devise),
                          style: const TextStyle(fontWeight: FontWeight.w800, color: AppCouleurs.primaire, fontSize: 15)),
                        const SizedBox(height: 4),
                        const Text('Voir', style: TextStyle(fontSize: 12, color: AppCouleurs.primaire)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildCreneaux(List<Creneau> creneaux) {
    final disponibles = creneaux.where((c) => c.disponible).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Créneaux disponibles', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        if (disponibles.isEmpty)
          const Carte(child: Padding(
            padding: EdgeInsets.all(16),
            child: Text('Aucun créneau disponible pour le moment',
              style: TextStyle(color: AppCouleurs.texteSecondaire)),
          ))
        else
          ...disponibles.map((c) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: GestureDetector(
              onTap: () => setState(() => _selectedCreneauId = c.id),
              child: Carte(
                child: Row(
                  children: [
                    Radio<String>(
                      value: c.id,
                      groupValue: _selectedCreneauId,
                      onChanged: (v) => setState(() => _selectedCreneauId = v),
                      activeColor: AppCouleurs.primaire,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Row(
                        children: [
                          Flexible(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${c.debut.substring(11, 16)} - ${c.fin.substring(11, 16)}',
                                  style: const TextStyle(fontWeight: FontWeight.w600)),
                                Text(c.debut.substring(0, 10),
                                  style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text('${c.capaciteTotale - c.capaciteReservee} places',
                            style: TextStyle(fontSize: 13,
                              color: c.capaciteTotale - c.capaciteReservee <= 2 ? AppCouleurs.alerte : AppCouleurs.succes)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )),
      ],
    );
  }

  Widget _buildRepartitionNotes(Prestataire prestataire, Map<String, dynamic> repartition) {
    if (prestataire.nombreAvis == 0) return const SizedBox.shrink();
    final total = (repartition.values.fold<int>(0, (a, b) => a + (b as int? ?? 0))).toDouble();
    if (total == 0) return const SizedBox.shrink();

    return Carte(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Avis clients', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Row(
            children: [
              Column(
                children: [
                  Text(prestataire.noteMoyenne.toStringAsFixed(1),
                    style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: AppCouleurs.accent)),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(5, (i) => Icon(
                      i < prestataire.noteMoyenne.round() ? Icons.star : Icons.star_border,
                      size: 16, color: AppCouleurs.accent,
                    )),
                  ),
                  Text('${prestataire.nombreAvis} avis',
                    style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                ],
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  children: List.generate(5, (i) {
                    final note = 5 - i;
                    final count = repartition[note.toString()] as int? ?? 0;
                    final ratio = total > 0 ? count / total : 0.0;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        children: [
                          SizedBox(width: 24, child: Text('$note', textAlign: TextAlign.right,
                            style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire))),
                          const SizedBox(width: 6),
                          const Icon(Icons.star, size: 12, color: AppCouleurs.accent),
                          const SizedBox(width: 6),
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: ratio,
                                backgroundColor: AppCouleurs.bordure,
                                color: AppCouleurs.accent,
                                minHeight: 8,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          SizedBox(width: 20, child: Text('$count',
                            style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire))),
                        ],
                      ),
                    );
                  }),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAvis(List<dynamic> avisList) {
    if (avisList.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text('Derniers avis', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const Spacer(),
            TextButton(
              onPressed: () => _showAllAvis(context, avisList),
              child: const Text('Voir tout', style: TextStyle(fontSize: 13)),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ...avisList.take(3).map((a) {
          final avis = Avis.fromJson(a as Map<String, dynamic>);
          final client = a['client'] as Map<String, dynamic>? ?? {};
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Carte(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: AppCouleurs.primaireClair,
                        child: Text((client['nom'] as String? ?? '?')[0].toUpperCase(),
                          style: const TextStyle(fontSize: 12, color: AppCouleurs.primaire)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(client['nom'] as String? ?? 'Client',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: List.generate(5, (j) => Icon(
                          j < avis.note ? Icons.star : Icons.star_border,
                          size: 14, color: AppCouleurs.accent,
                        )),
                      ),
                    ],
                  ),
                  if (avis.commentaire != null && avis.commentaire!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(avis.commentaire!, style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                  ],
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildServicesSimilaires(List<dynamic> similairesList) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Autres services du prestataire', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        ...similairesList.map((s) {
          final sim = ServiceAvecPrestataire.fromJson(s as Map<String, dynamic>);
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: () => context.go('/service/${sim.id}'),
              child: Carte(
                child: Row(
                  children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: AppCouleurs.primaireClair, borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.miscellaneous_services, color: AppCouleurs.primaire, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(sim.nom, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          Text(sim.nomEntreprise, style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                        ],
                      ),
                    ),
                    Text(_formaterMontant(sim.prix, sim.devise),
                      style: const TextStyle(fontWeight: FontWeight.w700, color: AppCouleurs.primaire)),
                    const SizedBox(width: 4),
                    const Icon(Icons.chevron_right, size: 18, color: AppCouleurs.texteSecondaire),
                  ],
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}

void _showDetailPackage(BuildContext context, Map<String, dynamic> pack) {
  final services = (pack['services'] as List<dynamic>? ?? [])
      .map((s) => (s as Map<String, dynamic>)['service'] as Map<String, dynamic>? ?? {})
      .toList();
  final nom = pack['nom'] as String? ?? 'Package';
  final description = pack['description'] as String?;
  final prix = (pack['prix'] as num?)?.toDouble() ?? 0;
  final devise = pack['devise'] as String? ?? 'CDF';

  String formater(double montant, String d) {
    if (d == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(
              color: AppCouleurs.bordure, borderRadius: BorderRadius.circular(2),
            ))),
            const SizedBox(height: 16),
            Text(nom, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(formater(prix, devise),
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
            if (description != null && description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(description, style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
            ],
            const SizedBox(height: 16),
            Text('Services inclus (${services.length})', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 8),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: services.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final s = services[i];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Container(
                      width: 38, height: 38,
                      decoration: BoxDecoration(color: AppCouleurs.primaireClair, borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.miscellaneous_services, color: AppCouleurs.primaire, size: 18),
                    ),
                    title: Text(s['nom'] as String? ?? 'Service', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    trailing: Text(formater((s['prix'] as num?)?.toDouble() ?? 0, s['devise'] as String? ?? 'CDF'),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCouleurs.primaire)),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            const Text('Forfait groupant plusieurs services de ce prestataire. Réservez chaque service individuellement via sa fiche.',
              style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 16),
            Bouton(
              titre: 'Réserver ce package',
              onPressed: () {
                Navigator.of(ctx).pop();
                context.push('/package/${pack['id']}');
              },
            ),
          ],
        ),
      ),
    ),
  );
}

void _showAllAvis(BuildContext context, List<dynamic> avisList) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (_, scrollCtrl) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(
              color: AppCouleurs.bordure, borderRadius: BorderRadius.circular(2),
            ))),
            const SizedBox(height: 16),
            Text('Tous les avis (${avisList.length})',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.separated(
                controller: scrollCtrl,
                itemCount: avisList.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final a = Avis.fromJson(avisList[i] as Map<String, dynamic>);
                  final client = avisList[i]['client'] as Map<String, dynamic>? ?? {};
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(vertical: 4),
                    leading: CircleAvatar(
                      radius: 16,
                      backgroundColor: AppCouleurs.primaireClair,
                      child: Text((client['nom'] as String? ?? '?')[0].toUpperCase(),
                        style: const TextStyle(fontSize: 14, color: AppCouleurs.primaire)),
                    ),
                    title: Row(
                      children: [
                        Text(client['nom'] as String? ?? 'Client',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        const Spacer(),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: List.generate(5, (j) => Icon(
                            j < a.note ? Icons.star : Icons.star_border,
                            size: 14, color: AppCouleurs.accent,
                          )),
                        ),
                      ],
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (a.commentaire != null && a.commentaire!.isNotEmpty)
                          Text(a.commentaire!, style: const TextStyle(fontSize: 13), maxLines: 3, overflow: TextOverflow.ellipsis),
                        Text(a.creeLe.substring(0, 10),
                          style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
