import 'package:reserva/services/api_client.dart';

Future<List<dynamic>> listerPublicitesActives({String? cible}) async {
  String path = '/publicites/actives';
  if (cible != null) path += '?cible=$cible';
  final resultat = await ApiClient.get(path);
  return resultat as List<dynamic>;
}

Future<void> incrementerCompteur(String publiciteId, String type) async {
  await ApiClient.post('/publicites/compteur', body: {
    'publiciteId': publiciteId,
    'type': type,
  });
}
