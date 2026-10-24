from pathlib import Path
import re

p = Path(__file__).resolve().parents[1] / "pubspec.yaml"
raw = p.read_bytes()
if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
    text = raw.decode("utf-16")
elif raw.startswith(b"\xef\xbb\xbf"):
    text = raw.decode("utf-8-sig")
else:
    text = raw.decode("utf-8")

text = re.sub(
    r"^description:.*$",
    'description: "RESERVA - Reservez. Sereinement."',
    text,
    count=1,
    flags=re.M,
)
text = re.sub(r"^version:.*$", "version: 1.0.5+51", text, count=1, flags=re.M)
text = text.replace("Icônes par flavor", "Icones par flavor")
text = text.replace("\r\n", "\n")
if not text.endswith("\n"):
    text += "\n"

p.write_bytes(text.encode("utf-8"))
check = p.read_bytes()
assert not check.startswith(b"\xff\xfe"), "still utf-16"
assert check.decode("utf-8").startswith("name: reserva")
print("OK", [ln for ln in text.splitlines() if ln.startswith(("version:", "description:"))])
