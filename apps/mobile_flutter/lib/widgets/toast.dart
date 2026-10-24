import 'package:flutter/material.dart';

class ToastWidget extends StatefulWidget {
  final String message;
  final String type;
  final VoidCallback? onReadyToRemove;

  const ToastWidget({super.key, required this.message, this.type = 'info', this.onReadyToRemove});

  static void show(BuildContext context, String message, {String type = 'info'}) {
    final overlay = Overlay.of(context, rootOverlay: true);
    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (_) => ToastWidget(
        message: message,
        type: type,
        onReadyToRemove: () {
          entry.remove();
        },
      ),
    );
    overlay.insert(entry);
  }

  @override
  State<ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<ToastWidget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slide;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 280));
    _slide = Tween<Offset>(begin: const Offset(0, 0.35), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
    _fade = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _controller.forward();
    Future.delayed(const Duration(milliseconds: 2600), _fermer);
  }

  Future<void> _fermer() async {
    if (!mounted) return;
    await _controller.reverse();
    widget.onReadyToRemove?.call();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _bgColor() {
    switch (widget.type) {
      case 'succes': return const Color(0xFFD1FAE5);
      case 'erreur': return const Color(0xFFFEE2E2);
      default: return const Color(0xFFDBEAFE);
    }
  }

  Color _textColor() {
    switch (widget.type) {
      case 'succes': return const Color(0xFF047857);
      case 'erreur': return const Color(0xFFB91C1C);
      default: return const Color(0xFF1D4ED8);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      bottom: 32,
      left: 16,
      right: 16,
      child: SlideTransition(
        position: _slide,
        child: FadeTransition(
          opacity: _fade,
          child: Material(
            color: Colors.transparent,
            child: SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                decoration: BoxDecoration(
                  color: _bgColor(),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [
                    BoxShadow(color: Colors.black26, blurRadius: 8, offset: Offset(0, 4)),
                  ],
                ),
                child: Text(
                  widget.message,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: _textColor()),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
