/**
 * SerdiPay / DreamDigital (via hub AfriSoft) rejette souvent :
 * - ponctuation de phrase (. : ; ! ?)
 * - lignes WebOTP (@host #code) et hash `<#>`
 */
export function sanitizeSmsPourSerdiPay(text: string): string {
  if (!text?.trim()) return text;

  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((line) => {
      if (!line) return false;
      if (line.startsWith("@")) return false;
      if (line.includes("@") && line.includes("#")) return false;
      if (line.startsWith("<#>")) return false;
      return true;
    });

  let joined = lines.join(" ");
  joined = joined.replace(/\.(\s|$)/g, " $1");
  joined = joined.replace(/[:;!?]/g, " ");
  joined = joined.replace(/[@#]/g, " ");
  joined = joined.replace(/\s+/g, " ").trim();

  if (!joined) {
    joined = text.replace(/[@#]/g, " ").replace(/\s+/g, " ").trim();
  }
  return joined;
}
