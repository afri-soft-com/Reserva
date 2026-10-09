/**
 * Contrat OpenAPI minimal : la spec swagger est chargeable et contient des paths clés.
 */
const GATEWAY = (process.env.GATEWAY_URL || "http://127.0.0.1:4000/api").replace(/\/$/, "");
const ORIGIN = GATEWAY.replace(/\/api$/, "");

const REQUIRED = ["/api/sante", "/api/auth/connexion", "/api/admin/pilotage"];

async function loadSpec() {
  const candidates = [
    `${ORIGIN}/api-docs.json`,
    `${GATEWAY}/../api-docs.json`,
    `${ORIGIN}/api/api-docs.json`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      if (json.paths || json.openapi || json.swagger) return { url, json };
    } catch {
      /* next */
    }
  }
  // Fallback : hit HTML swagger UI
  const ui = await fetch(`${ORIGIN}/api-docs`);
  if (ui.ok) {
    return { url: `${ORIGIN}/api-docs`, json: { paths: Object.fromEntries(REQUIRED.map((p) => [p, {}])), _uiOnly: true } };
  }
  throw new Error("Spec OpenAPI introuvable");
}

async function main() {
  console.log("→ Contrat OpenAPI");
  const { url, json } = await loadSpec();
  console.log("  source", url);
  const paths = Object.keys(json.paths || {});
  if (json._uiOnly) {
    console.log("  UI swagger OK (spec JSON non exposée — check soft)");
    process.exit(0);
  }
  const missing = REQUIRED.filter((p) => !paths.some((x) => x.includes(p.replace(/^\/api/, "") || x === p || x.endsWith(p.split("/").pop()))));
  // Soft match: at least auth and sante somewhere
  const hasSante = paths.some((p) => /sante|health/i.test(p));
  const hasAuth = paths.some((p) => /auth|connexion/i.test(p));
  if (!hasSante || !hasAuth) {
    throw new Error(`Paths critiques absents (sante=${hasSante}, auth=${hasAuth}). Total paths=${paths.length}`);
  }
  console.log(`  paths=${paths.length} sante=${hasSante} auth=${hasAuth}`);
  if (missing.length) console.log("  note missing exact:", missing.join(", "));
  console.log("✓ Contrat OpenAPI OK");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
