import 'dart:async';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:reserva/services/api_publicite.dart';
import 'package:reserva/providers/auth_provider.dart';
import 'package:reserva/config.dart';
import 'package:provider/provider.dart';

final _apiOrigin = Uri.parse(AppConfig.apiUrl).origin;

String _resoudreImage(String? url) {
  if (url == null || url.isEmpty) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return '$_apiOrigin$url';
}

class BannierePublicite extends StatefulWidget {
  const BannierePublicite({super.key});

  @override
  State<BannierePublicite> createState() => _BannierePubliciteState();
}

class _BannierePubliciteState extends State<BannierePublicite> {
  List<dynamic> _publicites = [];
  final Set<String> _fermees = {};
  bool _charge = false;
  final PageController _pageCtrl = PageController();
  Timer? _timer;
  int _pageCourante = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_charge) {
      _charge = true;
      _charger();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageCtrl.dispose();
    super.dispose();
  }

  List<dynamic> get _visibles => _publicites.where((p) => !_fermees.contains(p['id'])).toList();

  void _demarrerDefilement(int count) {
    if (count <= 1) {
      _timer?.cancel();
      return;
    }
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      final next = (_pageCourante + 1) % count;
      _pageCtrl.animateToPage(next, duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
    });
  }

  Future<void> _charger() async {
    try {
      final auth = context.read<AuthProvider>();
      final cible = auth.utilisateur?.role;
      final liste = await listerPublicitesActives(cible: cible);
      if (!mounted) return;
      setState(() => _publicites = liste);
      for (final pub in liste) {
        incrementerCompteur(pub['id'], 'IMPRESSION');
      }
      _demarrerDefilement(_visibles.length);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final visibles = _visibles;
    if (visibles.isEmpty) return const SizedBox.shrink();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: 80,
          child: PageView.builder(
            controller: _pageCtrl,
            onPageChanged: (i) {
              _pageCourante = i;
              setState(() {});
            },
            itemCount: visibles.length,
            itemBuilder: (_, i) => _buildCarte(visibles[i] as Map<String, dynamic>),
          ),
        ),
        if (visibles.length > 1)
          SizedBox(
            height: 10,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(visibles.length, (i) {
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: _pageCourante == i ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: _pageCourante == i ? const Color(0xFF2563EB) : const Color(0xFFBFDBFE),
                    borderRadius: BorderRadius.circular(3),
                  ),
                );
              }),
            ),
          ),
      ],
    );
  }

  void _showDetails(Map<String, dynamic> pub) {
    final imageUrl = pub['imageUrl'] as String?;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
              if (imageUrl != null && imageUrl.isNotEmpty)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(_resoudreImage(imageUrl), width: double.infinity, height: 120, fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(height: 80,
                    decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.campaign, size: 40, color: Colors.grey)),
                ),
              ),
            const SizedBox(height: 12),
            Text(pub['titre'] as String? ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center),
            if (pub['description'] != null && (pub['description'] as String).isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(pub['description'] as String, style: const TextStyle(fontSize: 14, color: Colors.grey),
                  textAlign: TextAlign.center),
              ),
            if (pub['lienUrl'] != null && (pub['lienUrl'] as String).isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: InkWell(
                  onTap: () => launchUrl(Uri.parse(pub['lienUrl'] as String), mode: LaunchMode.externalApplication),
                  child: Text(pub['lienUrl'] as String, style: const TextStyle(fontSize: 12, color: Colors.blue, decoration: TextDecoration.underline),
                    textAlign: TextAlign.center),
                ),
              ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Fermer')),
        ],
      ),
    );
  }

  Widget _buildCarte(Map<String, dynamic> pub) {
    final imageUrl = pub['imageUrl'] as String?;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF2563EB), Color(0xFF4F46E5)],
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () {
                incrementerCompteur(pub['id'], 'CLIC');
                final lien = pub['lienUrl'] as String?;
                if (lien != null && lien.isNotEmpty) {
                  launchUrl(Uri.parse(lien), mode: LaunchMode.externalApplication);
                }
                _showDetails(pub);
              },
              child: Stack(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(10, 8, 36, 8),
                    child: Row(
                      children: [
                        if (imageUrl != null && imageUrl.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(right: 10),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: Image.network(
                                _resoudreImage(imageUrl),
                                width: 48,
                                height: 36,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(
                                  width: 48, height: 36,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Icon(Icons.campaign, color: Colors.white, size: 20),
                                ),
                              ),
                            ),
                          )
                        else
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: Container(
                              width: 36, height: 36,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Icon(Icons.campaign, color: Colors.white, size: 24),
                            ),
                          ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            mainAxisAlignment: MainAxisAlignment.center,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                pub['titre'] as String? ?? '',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (pub['description'] != null && (pub['description'] as String).isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Text(
                                    pub['description'] as String,
                                    style: const TextStyle(
                                      color: Color(0xFFBFDBFE),
                                      fontSize: 11,
                                    ),
                                    textAlign: TextAlign.center,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: GestureDetector(
                      onTap: () {
                        setState(() => _fermees.add(pub['id'] as String));
                        _demarrerDefilement(_visibles.length);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(
                          color: Colors.black26,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close, color: Colors.white, size: 14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
