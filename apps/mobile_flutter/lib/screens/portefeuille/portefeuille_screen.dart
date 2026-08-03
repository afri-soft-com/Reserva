import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_portefeuille.dart';
import '../../widgets/carte.dart';
import '../../widgets/squelette.dart';
import '../../widgets/toast.dart';

class PortefeuilleScreen extends StatefulWidget {
  const PortefeuilleScreen({super.key});

  @override
  State<PortefeuilleScreen> createState() => _PortefeuilleScreenState();
}

class _PortefeuilleScreenState extends State<PortefeuilleScreen> {
  PortefeuilleData? _donnees;
  bool _chargement = true;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final donnees = await ApiPortefeuille.obtenirPortefeuille();
      if (mounted) setState(() => _donnees = donnees);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString(), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  String _formaterMontant(double montant, String devise) {
    final symbole = devise == 'USD' ? '\$' : 'FC';
    final texte = montant >= 1000
        ? '${(montant / 1000).toStringAsFixed(montant % 1000 == 0 ? 0 : 1)}K'
        : montant.toStringAsFixed(0);
    return '$texte $symbole';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(
        title: const Text('Mon portefeuille'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _charger),
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
                _buildSoldeGlobal(),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildStatCard(Icons.account_balance_wallet, 'Avoirs', _formaterMontant(_donnees?.soldeAvoirs.toDouble() ?? 0, _donnees?.deviseAvoirs ?? 'CDF'), AppCouleurs.primaire)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildStatCard(Icons.card_giftcard, 'Points', '${_donnees?.pointsFidelite ?? 0}', AppCouleurs.accent)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildStatCard(Icons.redeem, 'Cartes', _formaterMontant(_donnees?.soldeCartesCadeaux ?? 0, 'CDF'), AppCouleurs.succes)),
                  ],
                ),
                const SizedBox(height: 20),
                const Text('Historique récent', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                if (_donnees?.historique.isEmpty ?? true)
                  EcranVide(icone: Icons.receipt_long, message: 'Aucune transaction enregistrée')
                else
                  ..._donnees!.historique.map((l) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _buildLigne(l),
                  )),
              ],
            ),
          ),
    );
  }

  Widget _buildSoldeGlobal() {
    final total = ((_donnees?.soldeAvoirs ?? 0).toDouble()) +
        (_donnees?.soldeCartesCadeaux ?? 0) +
        (_donnees?.valeurPointsFC ?? 0);
    return Carte(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppCouleurs.primaire, AppCouleurs.primaireFonce],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Valeur totale du portefeuille', style: TextStyle(color: Colors.white70, fontSize: 13)),
            const SizedBox(height: 6),
            Text(
              _formaterMontant(total, 'CDF'),
              style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              '${_donnees?.pointsFidelite ?? 0} points de fidélité valent ${_formaterMontant(_donnees?.valeurPointsFC ?? 0, 'CDF')}',
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(IconData icone, String titre, String valeur, Color couleur) {
    return Carte(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icone, color: couleur, size: 22),
            const SizedBox(height: 6),
            Text(valeur, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppCouleurs.texte)),
            const SizedBox(height: 2),
            Text(titre, style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
          ],
        ),
      ),
    );
  }

  IconData _iconeType(String type) {
    switch (type) {
      case 'PAIEMENT':
        return Icons.arrow_downward;
      case 'POINTS':
        return Icons.card_giftcard;
      case 'AVOIR':
        return Icons.account_balance_wallet;
      default:
        return Icons.redeem;
    }
  }

  Color _couleurType(String type) {
    switch (type) {
      case 'PAIEMENT':
        return AppCouleurs.primaire;
      case 'POINTS':
        return AppCouleurs.accent;
      case 'AVOIR':
        return AppCouleurs.succes;
      default:
        return AppCouleurs.avertissement;
    }
  }

  Widget _buildLigne(LigneHistorique l) {
    final date = DateTime.tryParse(l.date);
    final dateTexte = date == null
        ? ''
        : '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    String? montantTexte;
    if (l.type == 'POINTS') {
      final signe = l.sens == 'DEPENSE' ? '-' : '+';
      montantTexte = '$signe${l.points} pts';
    } else if (l.montant != null) {
      montantTexte = _formaterMontant(l.montant!, l.devise ?? 'CDF');
    }

    return Carte(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _couleurType(l.type).withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(_iconeType(l.type), size: 18, color: _couleurType(l.type)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l.libelle, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(dateTexte, style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (montantTexte != null)
              Text(montantTexte, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: l.type == 'PAIEMENT' ? AppCouleurs.succes : AppCouleurs.primaire)),
          ],
        ),
      ),
    );
  }
}
