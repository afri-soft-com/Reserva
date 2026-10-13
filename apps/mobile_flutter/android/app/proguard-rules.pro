# Flutter ProGuard rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }
-keep class com.reserva.reserva.** { *; }

# Play Core
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.core.**

# Google Sign-In / Play Services Auth (idToken)
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.api.client.** { *; }
-keep class com.google.android.gms.signin.** { *; }
-dontwarn com.google.android.gms.**
