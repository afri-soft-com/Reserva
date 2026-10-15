/// Compare semver a.b.c — retourne negatif si a < b, 0 si egal, positif sinon.
int comparerVersions(String a, String b) {
  List<int> parts(String v) =>
      v.split(RegExp(r'[^0-9]+')).where((s) => s.isNotEmpty).map(int.parse).toList();
  final pa = parts(a);
  final pb = parts(b);
  for (var i = 0; i < 3; i++) {
    final x = i < pa.length ? pa[i] : 0;
    final y = i < pb.length ? pb[i] : 0;
    if (x != y) return x.compareTo(y);
  }
  return 0;
}

/// soft | force | none — aligné sur @reserva/shared decideModeMiseAJour.
String decideModeMiseAJour({
  required String versionInstallee,
  required String minSoft,
  required String minForce,
}) {
  if (comparerVersions(versionInstallee, minForce) < 0) return 'force';
  if (comparerVersions(versionInstallee, minSoft) < 0) return 'soft';
  return 'none';
}
