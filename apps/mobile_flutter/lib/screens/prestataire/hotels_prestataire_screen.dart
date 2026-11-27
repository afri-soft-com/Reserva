import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_hotels_pro.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

String _jourIso(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

String _jourCourt(DateTime d) =>
    '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';

String _messageErreur(Object e) => e.toString().replaceFirst('Exception: ', '');

/// Espace hôtelier du prestataire : hôtels, types de chambre, tarifs et inventaire.
class HotelsPrestataireScreen extends StatefulWidget {
  const HotelsPrestataireScreen({super.key});

  @override
  State<HotelsPrestataireScreen> createState() => _HotelsPrestataireScreenState();
}

class _HotelsPrestataireScreenState extends State<HotelsPrestataireScreen> {
  List<dynamic> _hotels = [];
  bool _chargement = true;
  String? _erreur;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    try {
      final hotels = await ApiHotelsPro.mesHotels();
      if (mounted) setState(() { _hotels = hotels; _erreur = null; });
    } catch (e) {
      if (mounted) setState(() => _erreur = _messageErreur(e));
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Future<void> _executer(Future<void> Function() action, String succes) async {
    try {
      await action();
      if (mounted) ToastWidget.show(context, succes, type: 'succes');
      await _charger();
    } catch (e) {
      if (mounted) ToastWidget.show(context, _messageErreur(e), type: 'erreur');
    }
  }

  // -------------------------------------------------------------------------
  // Hôtel
  // -------------------------------------------------------------------------

  Future<void> _editerHotel([Map<String, dynamic>? hotel]) async {
    final nomCtrl = TextEditingController(text: hotel?['nom'] as String? ?? '');
    final villeCtrl = TextEditingController(text: hotel?['ville'] as String? ?? '');
    final quartierCtrl = TextEditingController(text: hotel?['quartier'] as String? ?? '');
    final adresseCtrl = TextEditingController(text: hotel?['adresse'] as String? ?? '');
    final descCtrl = TextEditingController(text: hotel?['description'] as String? ?? '');
    final arriveeCtrl = TextEditingController(text: hotel?['checkInHeure'] as String? ?? '14:00');
    final departCtrl = TextEditingController(text: hotel?['checkOutHeure'] as String? ?? '12:00');
    int etoiles = (hotel?['etoiles'] as num?)?.toInt() ?? 3;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) => AlertDialog(
        title: Text(hotel == null ? 'Nouvel hôtel' : 'Modifier l\'hôtel'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nomCtrl, decoration: const InputDecoration(labelText: 'Nom de l\'hôtel')),
              TextField(controller: villeCtrl, decoration: const InputDecoration(labelText: 'Ville')),
              TextField(controller: quartierCtrl, decoration: const InputDecoration(labelText: 'Quartier')),
              TextField(controller: adresseCtrl, decoration: const InputDecoration(labelText: 'Adresse (optionnel)')),
              const SizedBox(height: 8),
              DropdownButtonFormField<int>(
                value: etoiles,
                decoration: const InputDecoration(labelText: 'Étoiles'),
                items: [1, 2, 3, 4, 5].map((n) => DropdownMenuItem(value: n, child: Text('$n ★'))).toList(),
                onChanged: (v) => setDialogState(() => etoiles = v ?? 3),
              ),
              if (hotel != null)
                Row(
                  children: [
                    Expanded(child: TextField(controller: arriveeCtrl, decoration: const InputDecoration(labelText: 'Arrivée (HH:MM)'))),
                    const SizedBox(width: 8),
                    Expanded(child: TextField(controller: departCtrl, decoration: const InputDecoration(labelText: 'Départ (HH:MM)'))),
                  ],
                ),
              TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 3),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Enregistrer')),
        ],
      )),
    );
    if (ok != true) return;
    if (nomCtrl.text.trim().length < 2 || villeCtrl.text.trim().length < 2 || quartierCtrl.text.trim().length < 2) {
      if (mounted) ToastWidget.show(context, 'Nom, ville et quartier sont requis', type: 'erreur');
      return;
    }
    final body = <String, dynamic>{
      'nom': nomCtrl.text.trim(),
      'ville': villeCtrl.text.trim(),
      'quartier': quartierCtrl.text.trim(),
      'etoiles': etoiles,
      if (adresseCtrl.text.trim().isNotEmpty) 'adresse': adresseCtrl.text.trim(),
      if (descCtrl.text.trim().isNotEmpty) 'description': descCtrl.text.trim(),
    };
    if (hotel == null) {
      await _executer(() => ApiHotelsPro.creerHotel(body), 'Hôtel créé');
    } else {
      body['checkInHeure'] = arriveeCtrl.text.trim();
      body['checkOutHeure'] = departCtrl.text.trim();
      await _executer(() => ApiHotelsPro.modifierHotel(hotel['id'] as String, body), 'Hôtel modifié');
    }
  }

  // -------------------------------------------------------------------------
  // Type de chambre
  // -------------------------------------------------------------------------

  Future<void> _editerChambre(String hotelId, [Map<String, dynamic>? chambre]) async {
    final nomCtrl = TextEditingController(text: chambre?['nom'] as String? ?? '');
    final litsCtrl = TextEditingController(text: chambre?['lits'] as String? ?? '1 lit double');
    final adultesCtrl = TextEditingController(text: '${chambre?['capaciteAdultes'] ?? 2}');
    final enfantsCtrl = TextEditingController(text: '${chambre?['capaciteEnfants'] ?? 1}');
    final surfaceCtrl = TextEditingController(text: chambre?['superficieM2']?.toString() ?? '');
    final descCtrl = TextEditingController(text: chambre?['description'] as String? ?? '');
    bool actif = chambre?['actif'] != false;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) => AlertDialog(
        title: Text(chambre == null ? 'Nouveau type de chambre' : 'Modifier la chambre'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nomCtrl, decoration: const InputDecoration(labelText: 'Nom', hintText: 'Ex : Chambre double supérieure')),
              TextField(controller: litsCtrl, decoration: const InputDecoration(labelText: 'Lits')),
              Row(
                children: [
                  Expanded(child: TextField(controller: adultesCtrl, decoration: const InputDecoration(labelText: 'Adultes max'), keyboardType: TextInputType.number)),
                  const SizedBox(width: 8),
                  Expanded(child: TextField(controller: enfantsCtrl, decoration: const InputDecoration(labelText: 'Enfants max'), keyboardType: TextInputType.number)),
                ],
              ),
              TextField(controller: surfaceCtrl, decoration: const InputDecoration(labelText: 'Surface (optionnel)', suffixText: 'm²'), keyboardType: TextInputType.number),
              TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 2),
              if (chambre != null)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: actif,
                  onChanged: (v) => setDialogState(() => actif = v),
                  title: const Text('En vente'),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Enregistrer')),
        ],
      )),
    );
    if (ok != true) return;
    final adultes = int.tryParse(adultesCtrl.text.trim());
    final enfants = int.tryParse(enfantsCtrl.text.trim());
    if (nomCtrl.text.trim().length < 2 || adultes == null || adultes < 1 || enfants == null || enfants < 0) {
      if (mounted) ToastWidget.show(context, 'Indiquez un nom et des capacités valides', type: 'erreur');
      return;
    }
    final body = <String, dynamic>{
      'nom': nomCtrl.text.trim(),
      'lits': litsCtrl.text.trim(),
      'capaciteAdultes': adultes,
      'capaciteEnfants': enfants,
      'superficieM2': int.tryParse(surfaceCtrl.text.trim()),
      'description': descCtrl.text.trim().isEmpty ? null : descCtrl.text.trim(),
      if (chambre != null) 'actif': actif,
    };
    if (chambre == null) {
      await _executer(() => ApiHotelsPro.creerChambre(hotelId, body), 'Chambre ajoutée — ouvrez maintenant son inventaire');
    } else {
      await _executer(() => ApiHotelsPro.modifierChambre(chambre['id'] as String, body), 'Chambre modifiée');
    }
  }

  // -------------------------------------------------------------------------
  // Plan tarifaire
  // -------------------------------------------------------------------------

  Future<void> _editerTarif(String chambreId, [Map<String, dynamic>? tarif]) async {
    final nomCtrl = TextEditingController(text: tarif?['nom'] as String? ?? 'Standard');
    final prixCtrl = TextEditingController(text: tarif?['prixParNuit']?.toString() ?? '');
    final delaiCtrl = TextEditingController(text: '${tarif?['delaiAnnulHeures'] ?? 48}');
    String devise = tarif?['devise'] as String? ?? 'USD';
    bool petitDej = tarif?['petitDejeuner'] == true;
    bool remboursable = tarif?['remboursable'] != false;
    bool actif = tarif?['actif'] != false;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) => AlertDialog(
        title: Text(tarif == null ? 'Nouveau tarif' : 'Modifier le tarif'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nomCtrl, decoration: const InputDecoration(labelText: 'Nom', hintText: 'Ex : Petit-déjeuner inclus')),
              Row(
                children: [
                  Expanded(flex: 3, child: TextField(controller: prixCtrl, decoration: const InputDecoration(labelText: 'Prix par nuit'), keyboardType: const TextInputType.numberWithOptions(decimal: true))),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: DropdownButtonFormField<String>(
                      value: devise,
                      decoration: const InputDecoration(labelText: 'Devise'),
                      items: const [
                        DropdownMenuItem(value: 'USD', child: Text('USD')),
                        DropdownMenuItem(value: 'CDF', child: Text('CDF')),
                      ],
                      onChanged: (v) => setDialogState(() => devise = v ?? 'USD'),
                    ),
                  ),
                ],
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: petitDej,
                onChanged: (v) => setDialogState(() => petitDej = v),
                title: const Text('Petit-déjeuner inclus'),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: remboursable,
                onChanged: (v) => setDialogState(() => remboursable = v),
                title: const Text('Remboursable'),
              ),
              if (remboursable)
                TextField(
                  controller: delaiCtrl,
                  decoration: const InputDecoration(labelText: 'Annulation gratuite jusqu\'à', suffixText: 'h avant'),
                  keyboardType: TextInputType.number,
                ),
              if (tarif != null)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: actif,
                  onChanged: (v) => setDialogState(() => actif = v),
                  title: const Text('Proposé aux clients'),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Enregistrer')),
        ],
      )),
    );
    if (ok != true) return;
    final prix = double.tryParse(prixCtrl.text.trim().replaceAll(',', '.'));
    if (nomCtrl.text.trim().length < 2 || prix == null || prix <= 0) {
      if (mounted) ToastWidget.show(context, 'Indiquez un nom et un prix valide', type: 'erreur');
      return;
    }
    final body = <String, dynamic>{
      'nom': nomCtrl.text.trim(),
      'prixParNuit': prix,
      'devise': devise,
      'petitDejeuner': petitDej,
      'remboursable': remboursable,
      'delaiAnnulHeures': int.tryParse(delaiCtrl.text.trim()) ?? 48,
      if (tarif != null) 'actif': actif,
    };
    if (tarif == null) {
      await _executer(() => ApiHotelsPro.creerTarif(chambreId, body), 'Tarif ajouté');
    } else {
      await _executer(() => ApiHotelsPro.modifierTarif(tarif['id'] as String, body), 'Tarif modifié');
    }
  }

  void _ouvrirInventaire(Map<String, dynamic> chambre) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => InventaireChambreScreen(
        chambreId: chambre['id'] as String,
        chambreNom: chambre['nom'] as String? ?? '',
      ),
    ));
  }

  // -------------------------------------------------------------------------
  // Affichage
  // -------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes hôtels')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _editerHotel(),
        icon: const Icon(Icons.add),
        label: const Text('Hôtel'),
      ),
      body: RefreshIndicator(
        onRefresh: _charger,
        child: _chargement
            ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                children: [
                  if (_erreur != null && _hotels.isEmpty)
                    EcranVide(
                      icone: Icons.error_outline,
                      message: 'Impossible de charger vos hôtels',
                      sousTitre: _erreur,
                      action: ElevatedButton(onPressed: _charger, child: const Text('Réessayer')),
                    )
                  else if (_hotels.isEmpty)
                    const EcranVide(
                      icone: Icons.hotel,
                      message: 'Aucun hôtel',
                      sousTitre: 'Créez votre hôtel, ajoutez vos types de chambre, leurs tarifs puis ouvrez l\'inventaire.',
                    )
                  else
                    ..._hotels.map((h) => _carteHotel(h as Map<String, dynamic>)),
                ],
              ),
      ),
    );
  }

  Widget _carteHotel(Map<String, dynamic> hotel) {
    final chambres = (hotel['chambres'] as List?) ?? [];
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Carte(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${hotel['nom']}  ${'★' * ((hotel['etoiles'] as num?)?.toInt() ?? 0)}',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      Text('${hotel['quartier']}, ${hotel['ville']}${hotel['actif'] == false ? ' · masqué' : ''}',
                        style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.edit_outlined, size: 20),
                  tooltip: 'Modifier l\'hôtel',
                  onPressed: () => _editerHotel(hotel),
                ),
              ],
            ),
            const Divider(),
            if (chambres.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text('Aucun type de chambre pour l\'instant.',
                  style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
              )
            else
              ...chambres.map((c) => _blocChambre(hotel['id'] as String, c as Map<String, dynamic>)),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () => _editerChambre(hotel['id'] as String),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Type de chambre'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _blocChambre(String hotelId, Map<String, dynamic> chambre) {
    final tarifs = (chambre['tarifs'] as List?) ?? [];
    final actif = chambre['actif'] != false;
    return Opacity(
      opacity: actif ? 1 : 0.5,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.bed_outlined, size: 18, color: AppCouleurs.primaire),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(chambre['nom'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text(
                        '${chambre['lits']} · ${chambre['capaciteAdultes']} adulte(s), ${chambre['capaciteEnfants']} enfant(s)${actif ? '' : ' · hors vente'}',
                        style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire),
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (v) {
                    if (v == 'inventaire') _ouvrirInventaire(chambre);
                    if (v == 'tarif') _editerTarif(chambre['id'] as String);
                    if (v == 'modifier') _editerChambre(hotelId, chambre);
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'inventaire', child: Text('Inventaire et prix par nuit')),
                    PopupMenuItem(value: 'tarif', child: Text('Ajouter un tarif')),
                    PopupMenuItem(value: 'modifier', child: Text('Modifier')),
                  ],
                ),
              ],
            ),
            if (tarifs.isEmpty)
              Padding(
                padding: const EdgeInsets.only(left: 26),
                child: Text('Aucun tarif : ajoutez-en un pour vendre cette chambre.',
                  style: const TextStyle(fontSize: 12, color: AppCouleurs.avertissement)),
              )
            else
              Padding(
                padding: const EdgeInsets.only(left: 26),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: tarifs.map((t) {
                    final tarif = t as Map<String, dynamic>;
                    return ActionChip(
                      visualDensity: VisualDensity.compact,
                      label: Text(
                        '${tarif['nom']} · ${tarif['prixParNuit']} ${tarif['devise']}${tarif['actif'] == false ? ' (inactif)' : ''}',
                        style: const TextStyle(fontSize: 12),
                      ),
                      onPressed: () => _editerTarif(chambre['id'] as String, tarif),
                    );
                  }).toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Inventaire jour par jour d'un type de chambre (30 jours glissants) + ouverture en masse.
class InventaireChambreScreen extends StatefulWidget {
  final String chambreId;
  final String chambreNom;

  const InventaireChambreScreen({super.key, required this.chambreId, required this.chambreNom});

  @override
  State<InventaireChambreScreen> createState() => _InventaireChambreScreenState();
}

class _InventaireChambreScreenState extends State<InventaireChambreScreen> {
  static const _joursAffiches = 30;
  static const _nomsJours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  DateTime _debut = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
  List<dynamic> _jours = [];
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final fin = _debut.add(const Duration(days: _joursAffiches - 1));
      final jours = await ApiHotelsPro.lireInventaire(widget.chambreId, _jourIso(_debut), _jourIso(fin));
      if (mounted) setState(() => _jours = jours);
    } catch (e) {
      if (mounted) ToastWidget.show(context, _messageErreur(e), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  void _decaler(int jours) {
    final aujourdhui = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final cible = _debut.add(Duration(days: jours));
    _debut = cible.isBefore(aujourdhui) ? aujourdhui : cible;
    _charger();
  }

  Future<void> _ouvrirPeriode({DateTime? jourUnique}) async {
    DateTime du = jourUnique ?? _debut;
    DateTime au = jourUnique ?? _debut.add(const Duration(days: _joursAffiches - 1));
    final totalCtrl = TextEditingController();
    final prixCtrl = TextEditingController();
    final joursSemaine = <int>{};
    if (jourUnique != null) {
      final existant = _jours.cast<Map<String, dynamic>>().where((j) => j['jour'] == _jourIso(jourUnique));
      if (existant.isNotEmpty) {
        totalCtrl.text = '${existant.first['total']}';
        final prix = (existant.first['prix'] as num?) ?? 0;
        if (prix > 0) prixCtrl.text = '$prix';
      }
    }

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDialogState) {
        Future<void> choisir(bool debut) async {
          final d = await showDatePicker(
            context: ctx,
            initialDate: debut ? du : au,
            firstDate: DateTime.now().subtract(const Duration(days: 1)),
            lastDate: DateTime.now().add(const Duration(days: 730)),
          );
          if (d == null) return;
          setDialogState(() {
            if (debut) {
              du = d;
              if (au.isBefore(du)) au = du;
            } else {
              au = d.isBefore(du) ? du : d;
            }
          });
        }

        return AlertDialog(
          title: Text(jourUnique != null ? 'Nuit du ${_jourCourt(jourUnique)}' : 'Ouvrir / ajuster des nuits'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (jourUnique == null) ...[
                  Row(
                    children: [
                      Expanded(child: OutlinedButton(onPressed: () => choisir(true), child: Text('Du ${_jourCourt(du)}'))),
                      const SizedBox(width: 8),
                      Expanded(child: OutlinedButton(onPressed: () => choisir(false), child: Text('Au ${_jourCourt(au)}'))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text('Jours concernés (aucun = tous)', style: TextStyle(fontSize: 12)),
                  Wrap(
                    spacing: 4,
                    children: List.generate(7, (i) {
                      final jour = (i + 1) % 7; // Lun … Dim
                      return FilterChip(
                        visualDensity: VisualDensity.compact,
                        label: Text(_nomsJours[jour], style: const TextStyle(fontSize: 12)),
                        selected: joursSemaine.contains(jour),
                        onSelected: (v) => setDialogState(() => v ? joursSemaine.add(jour) : joursSemaine.remove(jour)),
                      );
                    }),
                  ),
                ],
                TextField(
                  controller: totalCtrl,
                  decoration: const InputDecoration(labelText: 'Chambres à vendre par nuit', helperText: 'Vide = ne pas changer'),
                  keyboardType: TextInputType.number,
                ),
                TextField(
                  controller: prixCtrl,
                  decoration: const InputDecoration(labelText: 'Prix de la nuit (optionnel)', helperText: 'Vide = ne pas changer · 0 = prix du tarif'),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Appliquer')),
          ],
        );
      }),
    );
    if (ok != true) return;
    final total = totalCtrl.text.trim().isEmpty ? null : int.tryParse(totalCtrl.text.trim());
    final prix = prixCtrl.text.trim().isEmpty ? null : double.tryParse(prixCtrl.text.trim().replaceAll(',', '.'));
    if (total == null && prix == null) {
      if (mounted) ToastWidget.show(context, 'Indiquez un nombre de chambres et/ou un prix', type: 'erreur');
      return;
    }
    try {
      final r = await ApiHotelsPro.definirInventaire(
        widget.chambreId,
        du: _jourIso(du),
        au: _jourIso(au),
        total: total,
        prix: prix,
        joursSemaine: joursSemaine.toList(),
      );
      if (mounted) ToastWidget.show(context, '${r['joursMisAJour'] ?? ''} nuit(s) mise(s) à jour', type: 'succes');
      await _charger();
    } catch (e) {
      if (mounted) ToastWidget.show(context, _messageErreur(e), type: 'erreur');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Inventaire · ${widget.chambreNom}')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _ouvrirPeriode(),
        icon: const Icon(Icons.date_range),
        label: const Text('Ouvrir des nuits'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                IconButton(onPressed: () => _decaler(-_joursAffiches), icon: const Icon(Icons.chevron_left)),
                Expanded(
                  child: Text(
                    '${_jourCourt(_debut)} → ${_jourCourt(_debut.add(const Duration(days: _joursAffiches - 1)))}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                IconButton(onPressed: () => _decaler(_joursAffiches), icon: const Icon(Icons.chevron_right)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('Touchez une nuit pour la modifier. Libres = ouvertes − vendues − en cours de paiement.',
              style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
          ),
          Expanded(
            child: _chargement
                ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(8, 8, 8, 96),
                    itemCount: _jours.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final j = _jours[i] as Map<String, dynamic>;
                      final date = DateTime.parse(j['jour'] as String);
                      final total = (j['total'] as num?)?.toInt() ?? 0;
                      final libres = (j['libres'] as num?)?.toInt() ?? 0;
                      final vendues = (j['vendues'] as num?)?.toInt() ?? 0;
                      final retenues = (j['reservees'] as num?)?.toInt() ?? 0;
                      final prix = (j['prix'] as num?) ?? 0;
                      final couleur = total == 0
                          ? AppCouleurs.texteSecondaire
                          : libres == 0 ? AppCouleurs.alerte : AppCouleurs.succes;
                      return ListTile(
                        dense: true,
                        onTap: () => _ouvrirPeriode(jourUnique: date),
                        leading: SizedBox(
                          width: 44,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(_nomsJours[date.weekday % 7], style: const TextStyle(fontSize: 11)),
                              Text(_jourCourt(date), style: const TextStyle(fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                        title: Text(total == 0 ? 'Fermé à la vente' : '$libres libre(s) sur $total',
                          style: TextStyle(color: couleur, fontWeight: FontWeight.w600)),
                        subtitle: total == 0 ? null : Text('$vendues vendue(s) · $retenues en cours'),
                        trailing: prix > 0 ? Text('$prix', style: const TextStyle(fontWeight: FontWeight.w700)) : null,
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
