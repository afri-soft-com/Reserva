import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../providers/auth_provider.dart';
import '../../models/models.dart';
import '../../services/api_auth.dart';
import '../../services/api_client.dart';
import '../../widgets/otp_champ.dart';
import '../../widgets/toast.dart';

class ModifierProfilScreen extends StatefulWidget {
  const ModifierProfilScreen({super.key});

  @override
  State<ModifierProfilScreen> createState() => _ModifierProfilScreenState();
}

class _ModifierProfilScreenState extends State<ModifierProfilScreen> {
  late TextEditingController _nomCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _telCtrl;
  late TextEditingController _otpCtrl;
  late String _langue;
  bool _sauvegarde = false;
  bool _otpEnCours = false;
  bool _attenteOtp = false;
  String? _telephoneEnAttente;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().utilisateur!;
    _nomCtrl = TextEditingController(text: user.nom);
    _emailCtrl = TextEditingController(text: user.email ?? '');
    _telCtrl = TextEditingController(text: user.telephone);
    _otpCtrl = TextEditingController();
    _langue = user.langue;
  }

  @override
  void dispose() {
    _nomCtrl.dispose();
    _emailCtrl.dispose();
    _telCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _sauvegarder() async {
    if (_nomCtrl.text.trim().length < 2) {
      ToastWidget.show(context, 'Le nom doit contenir au moins 2 caractères', type: 'erreur');
      return;
    }
    setState(() => _sauvegarde = true);
    try {
      await context.read<AuthProvider>().mettreAJourProfil(
        nom: _nomCtrl.text.trim(),
        email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
        langue: _langue,
      );
      if (mounted) {
        ToastWidget.show(context, 'Profil mis à jour');
        context.pop();
      }
    } catch (e) {
      if (mounted) ToastWidget.show(context, 'Erreur: ${e.toString().replaceAll("Exception: ", "")}', type: 'erreur');
    } finally {
      if (mounted) setState(() => _sauvegarde = false);
    }
  }

  Future<void> _demanderOtpTelephone() async {
    final actuel = context.read<AuthProvider>().utilisateur?.telephone ?? '';
    final nouveau = _telCtrl.text.trim();
    if (nouveau.replaceAll(RegExp(r'\D'), '').length < 11) {
      ToastWidget.show(context, 'Numéro de téléphone invalide', type: 'erreur');
      return;
    }
    if (nouveau == actuel) {
      ToastWidget.show(context, 'Saisissez un nouveau numéro pour le modifier', type: 'erreur');
      return;
    }
    setState(() => _otpEnCours = true);
    try {
      final hash = await obtenirSmsAppHash();
      final data = await ApiAuth.demanderChangementTelephone(nouveau, smsAppHash: hash);
      if (!mounted) return;
      final codeEcran = data['codeOtp']?.toString();
      if (codeEcran != null && codeEcran.length == 6) {
        _otpCtrl.text = codeEcran;
      }
      setState(() {
        _attenteOtp = true;
        _telephoneEnAttente = data['telephone']?.toString() ?? nouveau;
      });
      final smsOk = data['smsEnvoye'] != false;
      ToastWidget.show(
        context,
        smsOk
            ? 'Code envoyé au $_telephoneEnAttente'
            : (codeEcran != null
                ? 'SMS indisponible — code : $codeEcran'
                : 'Impossible d\'envoyer le SMS. Réessayez.'),
        type: smsOk || codeEcran != null ? 'succes' : 'erreur',
      );
    } catch (e) {
      if (mounted) {
        ToastWidget.show(context, e.toString().replaceAll('Exception: ', ''), type: 'erreur');
      }
    } finally {
      if (mounted) setState(() => _otpEnCours = false);
    }
  }

  Future<void> _confirmerTelephone() async {
    final tel = _telephoneEnAttente ?? _telCtrl.text.trim();
    final code = _otpCtrl.text.trim();
    if (code.length != 6) {
      ToastWidget.show(context, 'Entrez le code à 6 chiffres', type: 'erreur');
      return;
    }
    setState(() => _otpEnCours = true);
    try {
      final data = await ApiAuth.confirmerChangementTelephone(tel, code);
      if (!mounted) return;
      final token = data['token'] as String?;
      final raw = data['utilisateur'];
      if (token == null || raw is! Map) {
        throw Exception('Réponse serveur invalide');
      }
      final utilisateur = Utilisateur.fromJson(Map<String, dynamic>.from(raw));
      final auth = context.read<AuthProvider>();
      await auth.connecterStore(token, utilisateur);
      await ApiClient.saveDernierTelephone(utilisateur.telephone);
      if (!mounted) return;
      setState(() {
        _attenteOtp = false;
        _telephoneEnAttente = null;
        _telCtrl.text = utilisateur.telephone;
        _otpCtrl.clear();
      });
      ToastWidget.show(context, 'Numéro mis à jour', type: 'succes');
    } catch (e) {
      if (mounted) {
        ToastWidget.show(context, e.toString().replaceAll('Exception: ', ''), type: 'erreur');
      }
    } finally {
      if (mounted) setState(() => _otpEnCours = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final actuel = context.watch<AuthProvider>().utilisateur?.telephone ?? '';
    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Modifier mon profil')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(color: AppCouleurs.primaireClair, shape: BoxShape.circle),
              child: const Icon(Icons.person, size: 40, color: AppCouleurs.primaire),
            ),
            const SizedBox(height: 24),
            const Text('Nom complet', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 6),
            TextField(
              controller: _nomCtrl,
              decoration: InputDecoration(
                hintText: 'Votre nom',
                filled: true, fillColor: AppCouleurs.blanc,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Téléphone', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 6),
            TextField(
              controller: _telCtrl,
              keyboardType: TextInputType.phone,
              enabled: !_attenteOtp,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: '+243…',
                filled: true, fillColor: AppCouleurs.blanc,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                helperText: 'Un SMS de vérification sera envoyé au nouveau numéro',
              ),
            ),
            const SizedBox(height: 8),
            if (!_attenteOtp)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: _otpEnCours || _telCtrl.text.trim() == actuel ? null : _demanderOtpTelephone,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppCouleurs.primaire,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _otpEnCours
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Changer le numéro (SMS)', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              )
            else ...[
              Text(
                'Code envoyé au $_telephoneEnAttente',
                style: TextStyle(fontSize: 13, color: AppCouleurs.texteSecondaire),
              ),
              const SizedBox(height: 8),
              OtpChamp(
                libelle: 'Code SMS',
                controller: _otpCtrl,
                onCompleted: (_) => _confirmerTelephone(),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _otpEnCours ? null : _confirmerTelephone,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppCouleurs.primaire,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _otpEnCours
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Confirmer le numéro', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: _otpEnCours
                        ? null
                        : () => setState(() {
                              _attenteOtp = false;
                              _telephoneEnAttente = null;
                              _otpCtrl.clear();
                              _telCtrl.text = actuel;
                            }),
                    child: const Text('Annuler'),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 16),
            const Text('Email (optionnel)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 6),
            TextField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                hintText: 'email@exemple.com',
                filled: true, fillColor: AppCouleurs.blanc,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Langue', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 8),
            Row(
              children: [
                _langueChip('fr', 'Français'),
                const SizedBox(width: 8),
                _langueChip('ln', 'Lingála'),
                const SizedBox(width: 8),
                _langueChip('sw', 'Kiswahili'),
              ],
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _sauvegarde || _attenteOtp ? null : _sauvegarder,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppCouleurs.primaire,
                  foregroundColor: AppCouleurs.blanc,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _sauvegarde
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Enregistrer le profil'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _langueChip(String code, String label) {
    final actif = _langue == code;
    return ChoiceChip(
      label: Text(label),
      selected: actif,
      selectedColor: AppCouleurs.primaire,
      backgroundColor: AppCouleurs.blanc,
      labelStyle: TextStyle(color: actif ? Colors.white : AppCouleurs.texte, fontSize: 13),
      onSelected: (_) => setState(() => _langue = code),
    );
  }
}
