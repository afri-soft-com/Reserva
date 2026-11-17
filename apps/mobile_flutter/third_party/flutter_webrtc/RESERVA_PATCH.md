# flutter_webrtc 1.3.0 — copie corrigée pour l'App Store

Source : https://pub.dev/packages/flutter_webrtc/versions/1.3.0 (archive pub.dev, intacte).
Dossiers retirés car inutiles au build : `example/`, `test/`, `Documentation/`.

Seule modification : `FlutterRTCDesktopCapturer.m` (copies `common/darwin`, `ios`, `macos`).
L'appel au sélecteur privé `RPSystemBroadcastPickerView.buttonPressed:` est remplacé
par un appui sur le `UIButton` public du sélecteur, comme dans flutter_webrtc 1.6.0
(changelog : « replace the private RPSystemBroadcastPickerView buttonPressed: selector
with public UIKit APIs », PR #2121).

Pourquoi : Apple refuse automatiquement RESERVA et RESERVA Pro (17/11/2026) :
« The app uses or references the following non-public or deprecated APIs:
RPSystemBroadcastPickerView.buttonPressed: ».

Pourquoi pas une simple mise à jour : livekit_client fixe flutter_webrtc à une version
exacte ; les versions qui embarquent 1.6.x (livekit_client ≥ 2.10) exigent meta 1.17
puis Flutter ≥ 3.38, alors que le projet est sur Flutter 3.32.6. Forcer flutter_webrtc 1.6
seul crée un conflit CocoaPods (WebRTC-SDK 137 contre 144).

À supprimer (avec le `dependency_overrides` de `pubspec.yaml`) lors du passage à
Flutter ≥ 3.38 et livekit_client ≥ 2.12.
