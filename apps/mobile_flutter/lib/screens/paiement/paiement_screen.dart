import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../models/models.dart';
import '../../services/api_paiements.dart';
import '../../services/api_reservations.dart';
import '../../services/api_codes_promos.dart';
import '../../services/api_fidelite.dart';
import '../../services/api_avoirs.dart';
import '../../widgets/carte.dart';
import '../../widgets/bouton.dart';
import '../../widgets/toast.dart';

class PaiementScreen extends StatefulWidget {
  final String reservationId;
  const PaiementScreen({super.key, required this.reservationId});

  @override
  State<PaiementScreen> createState() => _PaiementScreenState();
}

class _PaiementScreenState extends State<PaiementScreen> {
  ReservationDetaillee? _detail;
  bool _chargement = true;
  bool _envoi = false;
  bool _validationPromo = false;
  String _operateur = OperateurMobileMoney.mpesa;
  bool _acompte = false;

  // Code promo
  final _codePromoCtrl = TextEditingController();
  String? _codePromoApplique;
  double _montantReduction = 0;
  double _montantTotalAvecReduction = 0;

  // Fidélité
  final _pointsCtrl = TextEditingController();
  int _pointsSolde = 0;
  int _pointsAppliques = 0;
  bool _applicationPoints = false;
  bool _recupSoldePoints = false;

  // Avoirs
  double _soldeAvoirs = 0;
  double _montantAvoirApplique = 0;
  bool _applicationAvoir = false;
  bool _recupAvoirs = false;

  final _telephoneCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _charger();
  }

  @override
  void dispose() {
    _codePromoCtrl.dispose();
    _pointsCtrl.dispose();
    _telephoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final detail = await ApiReservations.obtenirDetail(widget.reservationId);
      if (mounted) {
        setState(() {
          _detail = detail;
          _montantTotalAvecReduction = detail.reservation.montantTotal;
        });
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
    _recupererSoldePoints();
    _recupererAvoirs();
  }

  Future<void> _recupererSoldePoints() async {
    setState(() => _recupSoldePoints = true);
    try {
      final solde = await ApiFidelite.obtenirSolde();
      if (mounted) setState(() => _pointsSolde = (solde['solde'] as num?)?.toInt() ?? 0);
    } catch (_) {
      // Section fidélité silencieuse si l'appel échoue
    } finally {
      if (mounted) setState(() => _recupSoldePoints = false);
    }
  }

  Future<void> _recupererAvoirs() async {
    setState(() => _recupAvoirs = true);
    try {
      final avoirs = await ApiAvoirs.obtenirMesAvoirs();
      if (mounted) {
        setState(() => _soldeAvoirs = (avoirs['soldeActif'] as num?)?.toDouble() ?? 0);
      }
    } catch (_) {
      // Section avoirs silencieuse si l'appel échoue
    } finally {
      if (mounted) setState(() => _recupAvoirs = false);
    }
  }

  Future<void> _appliquerCodePromo() async {
    final code = _codePromoCtrl.text.trim();
    if (code.isEmpty) return;
    setState(() => _validationPromo = true);
    try {
      final resultat = await ApiCodesPromos.appliquerCode(code,
          reservationId: widget.reservationId);
      if (mounted) {
        setState(() {
          _codePromoApplique = code;
          _montantReduction = (resultat['reduction'] as num?)?.toDouble() ?? 0;
          _montantTotalAvecReduction =
              (resultat['montantFinal'] as num?)?.toDouble() ?? _detail!.reservation.montantTotal;
        });
        ToastWidget.show(context,
            'Code appliqué : ${_formaterMontant(_montantReduction, _detail!.reservation.devise)} de réduction',
            type: 'succes');
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _validationPromo = false);
    }
  }

  Future<void> _appliquerPoints() async {
    final points = int.tryParse(_pointsCtrl.text.trim()) ?? 0;
    if (points <= 0) {
      ToastWidget.show(context, 'Saisissez un nombre de points valide.', type: 'erreur');
      return;
    }
    if (points > _pointsSolde) {
      ToastWidget.show(context, 'Solde de points insuffisant.', type: 'erreur');
      return;
    }
    setState(() => _applicationPoints = true);
    try {
      final resultat = await ApiFidelite.appliquerPoints(
        reservationId: widget.reservationId,
        points: points,
      );
      if (mounted) {
        setState(() {
          _pointsAppliques += points;
          _pointsSolde = (resultat['nouveauSolde'] as num?)?.toInt() ?? (_pointsSolde - points);
          _montantReduction += (resultat['reduction'] as num?)?.toDouble() ?? 0;
          _montantTotalAvecReduction =
              (resultat['montantFinal'] as num?)?.toDouble() ?? _montantTotalAvecReduction;
          _pointsCtrl.clear();
        });
        ToastWidget.show(
          context,
          '${(resultat['reduction'] as num?)?.toInt() ?? 0} FC de réduction appliqués avec vos points.',
          type: 'succes',
        );
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _applicationPoints = false);
    }
  }

  Future<void> _appliquerAvoir() async {
    setState(() => _applicationAvoir = true);
    try {
      final resultat = await ApiAvoirs.appliquerAvoir(reservationId: widget.reservationId);
      if (mounted) {
        setState(() {
          _montantAvoirApplique = (resultat['montantApplique'] as num?)?.toDouble() ?? 0;
          _soldeAvoirs = _soldeAvoirs - _montantAvoirApplique;
          _montantReduction += _montantAvoirApplique;
          _montantTotalAvecReduction =
              (resultat['montantFinal'] as num?)?.toDouble() ?? _montantTotalAvecReduction;
        });
        ToastWidget.show(
          context,
          '${_formaterMontant(_montantAvoirApplique, _detail!.reservation.devise)} de crédit appliqués.',
          type: 'succes',
        );
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _applicationAvoir = false);
    }
  }

  Future<void> _payer() async {
    if (_detail == null) return;
    setState(() => _envoi = true);
    try {
      final montantDeBase = _montantTotalAvecReduction - _detail!.reservation.montantPaye;
      final pct = (_detail?.reservation.acomptePourcent ?? 30) / 100;
      final montant = _acompte ? montantDeBase * pct : montantDeBase;
      await ApiPaiements.initierPaiement(
        reservationId: widget.reservationId,
        operateur: _operateur,
        montant: montant,
        telephonePaiement: _telephoneCtrl.text.isNotEmpty ? _telephoneCtrl.text : null,
        acompteUniquement: _acompte,
      );
      if (mounted) {
        ToastWidget.show(context, 'Paiement effectué avec succès.', type: 'succes');
        context.pop(true);
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _envoi = false);
    }
  }

  String _formaterMontant(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  @override
  Widget build(BuildContext context) {
    if (_chargement) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_detail == null) return const Scaffold(body: Center(child: Text('Réservation non trouvée')));

    final r = _detail!;
    final montantRestant = _montantTotalAvecReduction - r.reservation.montantPaye;
    final pct = (r.reservation.acomptePourcent) / 100;
    final montantAcompte = montantRestant * pct;

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Paiement')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Carte(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Résumé', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  _ligne('Service', r.service.nom),
                  _ligne('Prestataire', r.prestataire.nomEntreprise),
                  _ligne('Montant original', _formaterMontant(r.reservation.montantTotal, r.reservation.devise)),
                  if (_montantReduction > 0) ...[
                    _ligne('Réduction', '-${_formaterMontant(_montantReduction, r.reservation.devise)}',
                        valeurStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppCouleurs.succes)),
                    _ligne('Montant après réduction', _formaterMontant(_montantTotalAvecReduction, r.reservation.devise),
                        valeurStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppCouleurs.primaireFonce)),
                  ],
                  _ligne('Déjà payé', _formaterMontant(r.reservation.montantPaye, r.reservation.devise)),
                  Divider(height: 20, color: AppCouleurs.bordure),
                  _ligne('Restant dû', _formaterMontant(montantRestant, r.reservation.devise),
                    valeurStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppCouleurs.primaireFonce)),
                ],
              ),
            ),
            if (_codePromoApplique == null) ...[
              const SizedBox(height: 16),
              Carte(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Code promo', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _codePromoCtrl,
                            textCapitalization: TextCapitalization.characters,
                            decoration: InputDecoration(
                              hintText: 'Entrez un code',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRayons.champ)),
                              filled: true, fillColor: AppCouleurs.fondChamp,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Bouton(
                          titre: 'Appliquer',
                          variante: 'secondaire',
                          taille: 'sm',
                          chargement: _validationPromo,
                          onPressed: _appliquerCodePromo,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ] else ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppCouleurs.succesClair,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppCouleurs.succes.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: AppCouleurs.succes, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('Code $_codePromoApplique appliqué (-${_formaterMontant(_montantReduction, r.reservation.devise)})',
                          style: const TextStyle(fontSize: 13, color: AppCouleurs.succes, fontWeight: FontWeight.w600)),
                    ),
                    GestureDetector(
                      onTap: () => setState(() {
                        _codePromoApplique = null;
                        _montantReduction = 0;
                        _montantTotalAvecReduction = r.reservation.montantTotal;
                        _codePromoCtrl.clear();
                      }),
                      child: const Icon(Icons.close, size: 18, color: AppCouleurs.succes),
                    ),
                  ],
                ),
              ),
            ],
            if (_pointsSolde > 0 || _pointsAppliques > 0) ...[
              const SizedBox(height: 20),
              Carte(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.card_giftcard, size: 20, color: AppCouleurs.accent),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text('Dépenser mes points',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                        ),
                        if (_recupSoldePoints)
                          const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2)),
                        if (_pointsAppliques > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppCouleurs.succesClair,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text('$_pointsAppliques pts',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppCouleurs.succes)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('Solde: $_pointsSolde points (1 point = 50 FC de réduction)',
                      style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                    if (_pointsAppliques == 0) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _pointsCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                hintText: 'Nombre de points',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRayons.champ)),
                                filled: true, fillColor: AppCouleurs.fondChamp,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Bouton(
                            titre: 'Appliquer',
                            variante: 'secondaire',
                            taille: 'sm',
                            chargement: _applicationPoints,
                            onPressed: _appliquerPoints,
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
            if (_soldeAvoirs > 0 && _montantAvoirApplique <= 0) ...[
              const SizedBox(height: 12),
              Carte(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.account_balance_wallet, size: 20, color: AppCouleurs.primaire),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text('Crédits (avoirs) disponibles',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                        ),
                        if (_recupAvoirs)
                          const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('Solde: ${_formaterMontant(_soldeAvoirs, r.reservation.devise)} — obtenus lors d\'annulations.',
                      style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                    const SizedBox(height: 8),
                    Bouton(
                      titre: 'Utiliser mes crédits',
                      variante: 'secondaire',
                      taille: 'sm',
                      chargement: _applicationAvoir,
                      onPressed: _appliquerAvoir,
                    ),
                  ],
                ),
              ),
            ],
            if (_montantAvoirApplique > 0) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppCouleurs.succesClair,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppCouleurs.succes.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: AppCouleurs.succes, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('Crédits appliqués : ${_formaterMontant(_montantAvoirApplique, r.reservation.devise)}',
                          style: const TextStyle(fontSize: 13, color: AppCouleurs.succes, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),
            const Text('Opérateur', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _operateur,
              decoration: InputDecoration(
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRayons.champ)),
                filled: true, fillColor: AppCouleurs.fondChamp,
              ),
              items: const [
                DropdownMenuItem(value: 'MPESA', child: Text('M-Pesa')),
                DropdownMenuItem(value: 'AIRTEL_MONEY', child: Text('Airtel Money')),
                DropdownMenuItem(value: 'ORANGE_MONEY', child: Text('Orange Money')),
                DropdownMenuItem(value: 'ESPECES', child: Text('Espèces')),
              ],
              onChanged: (v) => setState(() => _operateur = v!),
            ),
            if (_operateur != 'ESPECES') ...[
              const SizedBox(height: 12),
              const Text('Téléphone de paiement', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              TextField(
                controller: _telephoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  hintText: '099XXXXXXXX',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRayons.champ)),
                  filled: true, fillColor: AppCouleurs.fondChamp,
                ),
              ),
            ],
            const SizedBox(height: 16),
            if (r.reservation.statutPaiement != 'PAYE' && montantRestant > 0) ...[
              Row(
                children: [
                  Checkbox(
                    value: _acompte,
                    onChanged: (v) => setState(() => _acompte = v ?? false),
                    activeColor: AppCouleurs.primaire,
                  ),
                  Expanded(
                    child: Text('Payer un acompte (${r.reservation.acomptePourcent}%) — ${_formaterMontant(montantAcompte, r.reservation.devise)} · solde plus tard',
                      style: const TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire)),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 24),
            Bouton(
              titre: 'Payer ${_formaterMontant(_acompte ? montantAcompte : montantRestant, r.reservation.devise)}',
              onPressed: _envoi ? null : _payer,
              chargement: _envoi,
            ),
          ],
        ),
      ),
    );
  }

  Widget _ligne(String label, String valeur, {TextStyle? valeurStyle}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
          const Spacer(),
          Flexible(child: Text(valeur, textAlign: TextAlign.right, style: valeurStyle ?? const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppCouleurs.texte))),
        ],
      ),
    );
  }
}
