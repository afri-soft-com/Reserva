/** Impression navigateur d'un bloc admin (rapports / listes). */
export function imprimerElement(titre: string, contenuHtml: string) {
  const fenetre = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!fenetre) {
    window.print();
    return;
  }
  fenetre.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${titre.replace(/</g, "&lt;")}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111; margin: 24px; font-size: 13px; }
    h1 { color: #1A56DB; font-size: 20px; margin: 0 0 4px; }
    .meta { color: #6B7280; font-size: 11px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #E5E7EB; padding: 8px 6px; text-align: left; }
    th { font-size: 11px; text-transform: uppercase; color: #6B7280; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h1>RESERVA — ${titre.replace(/</g, "&lt;")}</h1>
  <p class="meta">Généré le ${new Date().toLocaleString("fr-FR")} · Console admin</p>
  ${contenuHtml}
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`);
  fenetre.document.close();
}

export function tableVersHtml(entetes: string[], lignes: string[][]): string {
  const thead = entetes.map((h) => `<th>${esc(h)}</th>`).join("");
  const tbody = lignes
    .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
}

function esc(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
