import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../models/models.dart';
import '../../services/api_fidelite.dart';
import '../../services/api_avoirs.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';

class FideliteScreen extends StatefulWidget {
  const FideliteScreen({super.key});

  @override
  State<FideliteScreen> createState() => _FideliteScreenState();
}

class _FideliteScreenState extends State<FideliteScreen> {
  Map<String, dynamic>? _solde;
  List<PointTransaction> _transactions = [];
  Map<String, dynamic>? _avoirs;
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final results = await Future.wait([
        ApiFidelite.obtenirSolde(),
        ApiFidelite.obtenirHistorique(),
      ]);
      if (mounted) {
        setState(() {
          _solde = results[0] as Map<String, dynamic>;
          _transactions = (results[1] as ResultatPagine<PointTransaction>).items;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _solde = {'solde': 0, 'valeurEnFC': 0};
          _transactions = [];
        });
      }
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
    try {
      final avoirs = await ApiAvoirs.obtenirMesAvoirs();
      if (mounted) setState(() => _avoirs = avoirs);
    } catch (_) {
      // Section avoirs silencieuse si l'appel échoue
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: const Text('Programme fidélité'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _charger,
          ),
        ],
      ),
      body: _chargement
        ? const Padding(padding: EdgeInsets.all(16), child: Squelette())
        : RefreshIndicator(
            onRefresh: _charger,
            color: AppCouleurs.primaire,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildSoldeCard(),
                const SizedBox(height: 20),
                _buildAvoirsSection(),
                const SizedBox(height: 20),
                const Text('Historique des points', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                if (_transactions.isEmpty)
                  EcranVide(icone: Icons.card_giftcard, message: 'Aucune transaction de points',
                    sousTitre: 'Gagnez des points à chaque réservation payée.')
                else
                  ..._transactions.map((t) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _buildTransactionCard(t),
                  )),
              ],
            ),
          ),
    );
  }

  Widget _buildSoldeCard() {
    final solde = _solde?['solde'] as int? ?? 0;
    final valeurEnFC = _solde?['valeurEnFC'] as int? ?? 0;
    return Carte(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppCouleurs.accent.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.card_giftcard, size: 36, color: AppCouleurs.accent),
          ),
          const SizedBox(height: 12),
          Text('$solde', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: AppCouleurs.accent)),
          const SizedBox(height: 4),
          const Text('Points RESERVA', style: TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: AppCouleurs.succesClair,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text('Valeur: $valeurEnFC FC', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCouleurs.succes)),
          ),
        ],
      ),
    );
  }

  Widget _buildAvoirsSection() {
    final avoirs = _avoirs;
    if (avoirs == null) return const SizedBox.shrink();
    final items = (avoirs['items'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
    if (items.isEmpty) return const SizedBox.shrink();
    final soldeActif = (avoirs['soldeActif'] as num?)?.toDouble() ?? 0;
    final devise = avoirs['devise'] as String? ?? 'CDF';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Carte(
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppCouleurs.primaireClair,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.account_balance_wallet, color: AppCouleurs.primaire, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Crédits disponibles', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(_formaterMontant(soldeActif, devise),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppCouleurs.primaire)),
                    const Text('Crédits obtenus lors d\'annulations', style: TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Text('Mes avoirs', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...items.map((a) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Carte(
            child: Row(
              children: [
                Icon(
                  a['statut'] == 'ACTIF' ? Icons.check_circle : Icons.remove_circle_outline,
                  size: 20,
                  color: a['statut'] == 'ACTIF' ? AppCouleurs.succes : AppCouleurs.texteSecondaire,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Avoir ${_formaterMontant((a['montantInitial'] as num?)?.toDouble() ?? 0, devise)}',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      const SizedBox(height: 2),
                      Text(a['statut'] == 'ACTIF'
                          ? 'Restant: ${_formaterMontant((a['montantRestant'] as num?)?.toDouble() ?? 0, devise)}'
                          : 'Crédit utilisé',
                        style: const TextStyle(fontSize: 12, color: AppCouleurs.texteSecondaire)),
                      if (a['dateExpiration'] != null) ...[
                        const SizedBox(height: 2),
                        Text('Expire le: ${(a['dateExpiration'] as String).substring(0, 10)}',
                          style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        )),
      ],
    );
  }

  String _formaterMontant(double montant, String devise) {
    if (devise == 'USD') return '\$${montant.toStringAsFixed(2)}';
    return '${montant.toStringAsFixed(0)} FC';
  }

  Widget _buildTransactionCard(PointTransaction t) {
    final isGain = t.type == 'GAIN';
    return Carte(
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: (isGain ? AppCouleurs.succes : AppCouleurs.alerte).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isGain ? Icons.add_circle : Icons.remove_circle,
              size: 20,
              color: isGain ? AppCouleurs.succes : AppCouleurs.alerte,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t.description ?? (isGain ? 'Gain de points' : 'Dépense de points'),
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 2),
                Text(t.creeLe.substring(0, 10),
                  style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${isGain ? '+' : '-'}${t.montantPoints} pts',
                style: TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 14,
                  color: isGain ? AppCouleurs.succes : AppCouleurs.alerte)),
              Text('Solde: ${t.soldeApres}', style: const TextStyle(fontSize: 10, color: AppCouleurs.texteSecondaire)),
            ],
          ),
        ],
      ),
    );
  }
}
