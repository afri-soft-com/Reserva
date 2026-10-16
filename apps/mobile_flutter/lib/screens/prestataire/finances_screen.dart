import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/api_prestataire.dart';
import '../../widgets/toast.dart';

/// Solde prestataire : disponible vs séquestre + demande de versement.
class FinancesPrestataireScreen extends StatefulWidget {
  const FinancesPrestataireScreen({super.key});

  @override
  State<FinancesPrestataireScreen> createState() => _FinancesPrestataireScreenState();
}

class _FinancesPrestataireScreenState extends State<FinancesPrestataireScreen> {
  bool _chargement = true;
  Map<String, dynamic>? _data;
  final _montantCtrl = TextEditingController();
  final _telCtrl = TextEditingController();
  String _devise = 'CDF';
  String _operateur = 'MPESA';

  @override
  void initState() {
    super.initState();
    _charger();
  }

  @override
  void dispose() {
    _montantCtrl.dispose();
    _telCtrl.dispose();
    super.dispose();
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    try {
      final data = await ApiPrestataire.obtenirFinances();
      if (mounted) setState(() => _data = data);
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    } finally {
      if (mounted) setState(() => _chargement = false);
    }
  }

  Map<String, dynamic> _solde(String devise) {
    final soldes = _data?['soldes'] as Map<String, dynamic>? ?? {};
    return (soldes[devise] as Map<String, dynamic>?) ?? {};
  }

  Future<void> _demanderVersement() async {
    final montant = double.tryParse(_montantCtrl.text.replaceAll(',', '.'));
    if (montant == null || montant <= 0) {
      ToastWidget.show(context, 'Montant invalide', type: 'erreur');
      return;
    }
    if (_telCtrl.text.trim().length < 9) {
      ToastWidget.show(context, 'Numéro Mobile Money requis', type: 'erreur');
      return;
    }
    try {
      await ApiPrestataire.demanderVersement({
        'montant': montant,
        'devise': _devise,
        'operateur': _operateur,
        'telephonePaiement': _telCtrl.text.trim(),
      });
      if (mounted) {
        ToastWidget.show(context, 'Demande de versement envoyée', type: 'succes');
        _montantCtrl.clear();
        await _charger();
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, e.toString().replaceFirst('Exception: ', ''), type: 'erreur');
    }
  }

  @override
  Widget build(BuildContext context) {
    final cdf = _solde('CDF');
    final usd = _solde('USD');
    final versements = (_data?['versements'] as List?) ?? [];

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Mes finances')),
      body: _chargement
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _charger,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'Le paiement client est d\'abord séquestré. Il devient disponible après la fin de la prestation.',
                    style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire),
                  ),
                  const SizedBox(height: 16),
                  _carteSolde('CDF', cdf),
                  const SizedBox(height: 12),
                  _carteSolde('USD', usd),
                  const SizedBox(height: 24),
                  const Text('Demander un versement', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _devise,
                    decoration: const InputDecoration(labelText: 'Devise', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'CDF', child: Text('CDF')),
                      DropdownMenuItem(value: 'USD', child: Text('USD')),
                    ],
                    onChanged: (v) => setState(() => _devise = v ?? 'CDF'),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _operateur,
                    decoration: const InputDecoration(labelText: 'Opérateur', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'MPESA', child: Text('M-Pesa')),
                      DropdownMenuItem(value: 'AIRTEL_MONEY', child: Text('Airtel Money')),
                      DropdownMenuItem(value: 'ORANGE_MONEY', child: Text('Orange Money')),
                    ],
                    onChanged: (v) => setState(() => _operateur = v ?? 'MPESA'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _montantCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Montant', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _telCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Téléphone Mobile Money', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _demanderVersement,
                    child: const Text('Envoyer la demande'),
                  ),
                  const SizedBox(height: 24),
                  const Text('Historique des versements', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  if (versements.isEmpty)
                    const Text('Aucun versement', style: TextStyle(color: AppCouleurs.texteSecondaire))
                  else
                    ...versements.map((v) {
                      final m = v as Map<String, dynamic>;
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text('${m['montant']} ${m['devise']}'),
                        subtitle: Text('${m['statut']} · ${m['operateur'] ?? ''}'),
                      );
                    }),
                ],
              ),
            ),
    );
  }

  Widget _carteSolde(String devise, Map<String, dynamic> s) {
    final dispo = (s['disponible'] as num?)?.toDouble() ?? 0;
    final seq = (s['enSequestre'] as num?)?.toDouble() ?? 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppCouleurs.blanc,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppCouleurs.bordure),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(devise, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 8),
          Text('Disponible : ${dispo.toStringAsFixed(devise == 'USD' ? 2 : 0)} $devise',
              style: const TextStyle(color: AppCouleurs.succes, fontWeight: FontWeight.w600)),
          Text('En séquestre : ${seq.toStringAsFixed(devise == 'USD' ? 2 : 0)} $devise',
              style: const TextStyle(color: AppCouleurs.avertissement, fontSize: 13)),
        ],
      ),
    );
  }
}
