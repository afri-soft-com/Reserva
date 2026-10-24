from PIL import Image
from pathlib import Path
import json

CONTENTS = {
  "images": [
    {"size": "20x20", "idiom": "iphone", "filename": "Icon-App-20x20@2x.png", "scale": "2x"},
    {"size": "20x20", "idiom": "iphone", "filename": "Icon-App-20x20@3x.png", "scale": "3x"},
    {"size": "29x29", "idiom": "iphone", "filename": "Icon-App-29x29@1x.png", "scale": "1x"},
    {"size": "29x29", "idiom": "iphone", "filename": "Icon-App-29x29@2x.png", "scale": "2x"},
    {"size": "29x29", "idiom": "iphone", "filename": "Icon-App-29x29@3x.png", "scale": "3x"},
    {"size": "40x40", "idiom": "iphone", "filename": "Icon-App-40x40@2x.png", "scale": "2x"},
    {"size": "40x40", "idiom": "iphone", "filename": "Icon-App-40x40@3x.png", "scale": "3x"},
    {"size": "57x57", "idiom": "iphone", "filename": "Icon-App-57x57@1x.png", "scale": "1x"},
    {"size": "57x57", "idiom": "iphone", "filename": "Icon-App-57x57@2x.png", "scale": "2x"},
    {"size": "60x60", "idiom": "iphone", "filename": "Icon-App-60x60@2x.png", "scale": "2x"},
    {"size": "60x60", "idiom": "iphone", "filename": "Icon-App-60x60@3x.png", "scale": "3x"},
    {"size": "20x20", "idiom": "ipad", "filename": "Icon-App-20x20@1x.png", "scale": "1x"},
    {"size": "20x20", "idiom": "ipad", "filename": "Icon-App-20x20@2x.png", "scale": "2x"},
    {"size": "29x29", "idiom": "ipad", "filename": "Icon-App-29x29@1x.png", "scale": "1x"},
    {"size": "29x29", "idiom": "ipad", "filename": "Icon-App-29x29@2x.png", "scale": "2x"},
    {"size": "40x40", "idiom": "ipad", "filename": "Icon-App-40x40@1x.png", "scale": "1x"},
    {"size": "40x40", "idiom": "ipad", "filename": "Icon-App-40x40@2x.png", "scale": "2x"},
    {"size": "50x50", "idiom": "ipad", "filename": "Icon-App-50x50@1x.png", "scale": "1x"},
    {"size": "50x50", "idiom": "ipad", "filename": "Icon-App-50x50@2x.png", "scale": "2x"},
    {"size": "72x72", "idiom": "ipad", "filename": "Icon-App-72x72@1x.png", "scale": "1x"},
    {"size": "72x72", "idiom": "ipad", "filename": "Icon-App-72x72@2x.png", "scale": "2x"},
    {"size": "76x76", "idiom": "ipad", "filename": "Icon-App-76x76@1x.png", "scale": "1x"},
    {"size": "76x76", "idiom": "ipad", "filename": "Icon-App-76x76@2x.png", "scale": "2x"},
    {"size": "83.5x83.5", "idiom": "ipad", "filename": "Icon-App-83.5x83.5@2x.png", "scale": "2x"},
    {"size": "1024x1024", "idiom": "ios-marketing", "filename": "Icon-App-1024x1024@1x.png", "scale": "1x"},
  ],
  "info": {"version": 1, "author": "xcode"},
}

SIZES = {
    "Icon-App-20x20@1x.png": 20,
    "Icon-App-20x20@2x.png": 40,
    "Icon-App-20x20@3x.png": 60,
    "Icon-App-29x29@1x.png": 29,
    "Icon-App-29x29@2x.png": 58,
    "Icon-App-29x29@3x.png": 87,
    "Icon-App-40x40@1x.png": 40,
    "Icon-App-40x40@2x.png": 80,
    "Icon-App-40x40@3x.png": 120,
    "Icon-App-50x50@1x.png": 50,
    "Icon-App-50x50@2x.png": 100,
    "Icon-App-57x57@1x.png": 57,
    "Icon-App-57x57@2x.png": 114,
    "Icon-App-60x60@2x.png": 120,
    "Icon-App-60x60@3x.png": 180,
    "Icon-App-72x72@1x.png": 72,
    "Icon-App-72x72@2x.png": 144,
    "Icon-App-76x76@1x.png": 76,
    "Icon-App-76x76@2x.png": 152,
    "Icon-App-83.5x83.5@2x.png": 167,
    "Icon-App-1024x1024@1x.png": 1024,
}

BG = (11, 18, 32, 255)


def make_set(src_path: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for p in out_dir.glob("*.png"):
        p.unlink()
    src = Image.open(src_path).convert("RGBA")
    # Opaque brand background — App Store rejects alpha on marketing icon.
    canvas_bg = Image.new("RGBA", src.size, BG)
    src = Image.alpha_composite(canvas_bg, src).convert("RGB")
    for name, px in SIZES.items():
        img = src.resize((px, px), Image.Resampling.LANCZOS)
        img.save(out_dir / name, format="PNG", optimize=True)
    (out_dir / "Contents.json").write_text(
        json.dumps(CONTENTS, indent=2) + "\n", encoding="utf-8"
    )
    missing = [
        im["filename"]
        for im in CONTENTS["images"]
        if not (out_dir / im["filename"]).exists()
    ]
    print(f"{out_dir.name}: {len(list(out_dir.glob('*.png')))} png, missing={missing}")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    assets = root / "ios" / "Runner" / "Assets.xcassets"
    make_set(root / "assets" / "icon_client.png", assets / "AppIcon.appiconset")
    make_set(root / "assets" / "icon_client.png", assets / "AppIcon-client.appiconset")
    make_set(root / "assets" / "icon_pro.png", assets / "AppIcon-pro.appiconset")


if __name__ == "__main__":
    main()
