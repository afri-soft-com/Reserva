import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import '../../theme.dart';
import '../../providers/auth_provider.dart';
import '../../models/models.dart';
import '../../services/api_prestataire.dart';
import '../../widgets/carte.dart';
import '../../widgets/toast.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/badge_notification.dart';
import '../../services/api_avis.dart';

class ProfilScreen extends StatelessWidget {
  const ProfilScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.utilisateur;

    return Scaffold(
      backgroundColor: AppCouleurs.fond,
      appBar: AppBar(title: const Text('Profil')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const CircleAvatar(
              radius: 40,
              backgroundColor: AppCouleurs.primaireClair,
              child: Icon(Icons.person, size: 40, color: AppCouleurs.primaire),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(user?.nom ?? 'Utilisateur', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => context.push('/modifier-profil'),
                  child: const Icon(Icons.edit, size: 18, color: AppCouleurs.primaire),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(user?.telephone ?? '', style: const TextStyle(fontSize: 14, color: AppCouleurs.texteSecondaire)),
            const SizedBox(height: 24),
            Carte(
              child: Column(
                children: [
                  _infoRow(Icons.phone, 'Téléphone', user?.telephone ?? ''),
                  const Divider(height: 24),
                  _infoRow(Icons.email, 'Email', user?.email ?? 'Non renseigné'),
                  const Divider(height: 24),
                  _infoRow(Icons.language, 'Langue', user?.langue == 'fr' ? 'Français' : user?.langue == 'ln' ? 'Lingála' : 'Kiswahili'),
                ],
              ),
            ),
            if (auth.biometrieDisponible) ...[
              const SizedBox(height: 16),
              Carte(
                child: SwitchListTile(
                  title: const Text('Déverrouillage biométrique', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Utilisez votre empreinte ou FaceID'),
                  secondary: const Icon(Icons.fingerprint, color: AppCouleurs.primaire),
                  value: auth.biometrieActivee,
                  onChanged: (_) => auth.basculerBiometrie(),
                  activeColor: AppCouleurs.primaire,
                ),
              ),
            ],
            const SizedBox(height: 16),
            Carte(
              child: SwitchListTile(
                title: const Text('Mode sombre', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(context.watch<ThemeProvider>().estSombre ? 'Activé' : 'Désactivé'),
                secondary: Icon(
                  context.watch<ThemeProvider>().estSombre ? Icons.dark_mode : Icons.light_mode,
                  color: AppCouleurs.accent,
                ),
                value: context.watch<ThemeProvider>().estSombre,
                onChanged: (_) => context.read<ThemeProvider>().basculer(),
                activeColor: AppCouleurs.accent,
              ),
            ),
            const SizedBox(height: 16),
            Carte(
              child: Column(
                children: [
                  ListTile(
                    leading: const BadgeNotification(child: Icon(Icons.notifications_outlined, color: AppCouleurs.primaire)),
                    title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/notifications'),
                  ),
                  const Divider(height: 1, indent: 56),
                  ListTile(
                    leading: const Icon(Icons.favorite_outline, color: AppCouleurs.alerte),
                    title: const Text('Mes favoris', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/favoris'),
                  ),
                  const Divider(height: 1, indent: 56),
                  ListTile(
                    leading: const Icon(Icons.card_giftcard, color: AppCouleurs.accent),
                    title: const Text('Programme fidélité', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/fidelite'),
                  ),
                  const Divider(height: 1, indent: 56),
                  ListTile(
                    leading: const Icon(Icons.chat_outlined, color: AppCouleurs.primaire),
                    title: const Text('Messages', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/conversations'),
                  ),
                  const Divider(height: 1, indent: 56),
                  ListTile(
                    leading: const Icon(Icons.star_outline, color: AppCouleurs.accent),
                    title: const Text('Mes avis', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      final avis = await ApiAvis.listerMesAvis();
                      if (!context.mounted) return;
                      _showMesAvis(context, avis);
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Carte(
              child: ListTile(
                leading: const Icon(Icons.lock_outline, color: AppCouleurs.primaire),
                title: const Text('Changer mon code PIN', style: TextStyle(fontWeight: FontWeight.w600)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/changer-pin'),
              ),
            ),
            if (!auth.estPrestataire && !auth.estAdmin) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _showDevenirPrestataireDialog(context),
                  icon: const Icon(Icons.business_center, color: AppCouleurs.blanc),
                  label: const Text('Devenir prestataire', style: TextStyle(color: AppCouleurs.blanc)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppCouleurs.primaire,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  await auth.deconnecter();
                  if (context.mounted) context.go('/connexion');
                },
                icon: const Icon(Icons.logout, color: AppCouleurs.alerte),
                label: const Text('Déconnexion', style: TextStyle(color: AppCouleurs.alerte)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppCouleurs.alerte),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppCouleurs.texteSecondaire),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCouleurs.texteSecondaire)),
            Text(value, style: const TextStyle(fontSize: 15, color: AppCouleurs.texte)),
          ],
        ),
      ],
    );
  }
}

void _showDevenirPrestataireDialog(BuildContext context) {
  final nomCtrl = TextEditingController();
  final villeCtrl = TextEditingController();
  final quartierCtrl = TextEditingController();
  final adresseCtrl = TextEditingController();
  String categorie = 'SANTE';
  final latitudeCtrl = TextEditingController();
  final longitudeCtrl = TextEditingController();
  bool chargementLocalisation = false;
  bool envoi = false;

  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDialogState) => AlertDialog(
        title: const Text('Devenir prestataire'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nomCtrl,
                decoration: const InputDecoration(labelText: 'Nom de l\'entreprise *', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: categorie,
                decoration: const InputDecoration(labelText: 'Catégorie *', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'SANTE', child: Text('Santé')),
                  DropdownMenuItem(value: 'TRANSPORT', child: Text('Transport')),
                  DropdownMenuItem(value: 'HOTELLERIE', child: Text('Hôtellerie')),
                  DropdownMenuItem(value: 'RESTAURATION', child: Text('Restauration')),
                  DropdownMenuItem(value: 'SALLE_REUNION', child: Text('Salle de réunion')),
                  DropdownMenuItem(value: 'ADMINISTRATIF', child: Text('Administratif')),
                  DropdownMenuItem(value: 'EDUCATION', child: Text('Éducation')),
                ],
                onChanged: (v) => setDialogState(() => categorie = v ?? 'SANTE'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: villeCtrl,
                decoration: const InputDecoration(labelText: 'Ville *', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: quartierCtrl,
                decoration: const InputDecoration(labelText: 'Quartier *', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: adresseCtrl,
                decoration: const InputDecoration(labelText: 'Adresse', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: latitudeCtrl,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Latitude', border: OutlineInputBorder(), hintText: '-4.3050'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: longitudeCtrl,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Longitude', border: OutlineInputBorder(), hintText: '15.3050'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 56,
                    child: ElevatedButton(
                      onPressed: chargementLocalisation ? null : () async {
                        setDialogState(() => chargementLocalisation = true);
                        try {
                          final permission = await Geolocator.requestPermission();
                          if (permission == LocationPermission.denied) return;
                          final pos = await Geolocator.getCurrentPosition();
                          setDialogState(() {
                            latitudeCtrl.text = pos.latitude.toStringAsFixed(6);
                            longitudeCtrl.text = pos.longitude.toStringAsFixed(6);
                            chargementLocalisation = false;
                          });
                        } catch (_) {
                          setDialogState(() => chargementLocalisation = false);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.all(12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: chargementLocalisation
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.my_location, size: 20),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: envoi ? null : () async {
              if (nomCtrl.text.trim().isEmpty || villeCtrl.text.trim().isEmpty || quartierCtrl.text.trim().isEmpty) {
                ToastWidget.show(ctx, 'Veuillez remplir tous les champs obligatoires.', type: 'erreur');
                return;
              }
              setDialogState(() => envoi = true);
              try {
                final lat = double.tryParse(latitudeCtrl.text.trim().replaceAll(',', '.'));
                final lng = double.tryParse(longitudeCtrl.text.trim().replaceAll(',', '.'));
                await ApiPrestataire.creerProfilPrestataire({
                  'nomEntreprise': nomCtrl.text.trim(),
                  'categorie': categorie,
                  'ville': villeCtrl.text.trim(),
                  'quartier': quartierCtrl.text.trim(),
                  'adresse': adresseCtrl.text.trim().isEmpty ? null : adresseCtrl.text.trim(),
                  if (lat != null && lng != null) ...{
                    'latitude': lat,
                    'longitude': lng,
                  },
                });
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  ToastWidget.show(ctx, 'Profil prestataire créé. En attente de validation.', type: 'succes');
                }
              } catch (e) {
                if (ctx.mounted) ToastWidget.show(ctx, e.toString(), type: 'erreur');
              } finally {
                if (ctx.mounted) setDialogState(() => envoi = false);
              }
            },
            child: envoi ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Envoyer'),
          ),
        ],
      ),
    ),
  );
}

void _showMesAvis(BuildContext context, List<Avis> avis) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      builder: (_, scrollCtrl) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(
              color: AppCouleurs.bordure, borderRadius: BorderRadius.circular(2),
            ))),
            const SizedBox(height: 16),
            Text('Mes avis (${avis.length})', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            if (avis.isEmpty)
              const Expanded(child: Center(child: Text('Aucun avis pour le moment.',
                style: TextStyle(color: AppCouleurs.texteSecondaire))))
            else
              Expanded(
                child: ListView.separated(
                  controller: scrollCtrl,
                  itemCount: avis.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final a = avis[i];
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(vertical: 4),
                      leading: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: List.generate(5, (j) => Icon(
                          j < a.note ? Icons.star : Icons.star_border,
                          size: 16, color: AppCouleurs.accent,
                        )),
                      ),
                      title: Text(a.commentaire ?? 'Sans commentaire',
                        style: const TextStyle(fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                      subtitle: Text(a.creeLe.substring(0, 10),
                        style: const TextStyle(fontSize: 11, color: AppCouleurs.texteSecondaire)),
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
