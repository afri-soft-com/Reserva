#!/usr/bin/env node
/**
 * Garde-fou CI : les bannières de mise à jour (mobile + web) restent câblées
 * et se mettent à jour en cours d'utilisation. Échoue si un futur refactor casse le wiring.
 *
 * Usage: node scripts/check-update-banners.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) throw new Error(`Fichier manquant: ${rel}`);
  return fs.readFileSync(p, "utf8");
}

function mustInclude(rel, needles, label) {
  const src = read(rel);
  for (const n of needles) {
    if (!src.includes(n)) {
      throw new Error(`[${label}] ${rel} doit contenir « ${n} »`);
    }
  }
  console.log(`  ✓ ${label}: ${rel}`);
}

function mustMatch(rel, regex, label) {
  const src = read(rel);
  if (!regex.test(src)) {
    throw new Error(`[${label}] ${rel} ne matche pas ${regex}`);
  }
  console.log(`  ✓ ${label}: ${rel}`);
}

console.log("→ Garde-fou bannières de mise à jour");

mustInclude(
  "apps/mobile_flutter/lib/bootstrap.dart",
  ["MiseAJourGate", "mise_a_jour_gate.dart"],
  "mobile-wiring"
);
mustInclude(
  "apps/mobile_flutter/lib/widgets/mise_a_jour_gate.dart",
  [
    "ApiAppVersions",
    "decideModeMiseAJour",
    "minSoft",
    "minForce",
    "kIntervallePollMiseAJour",
    "Timer.periodic",
    "AppLifecycleState.resumed",
  ],
  "mobile-gate"
);
mustMatch(
  "apps/mobile_flutter/lib/widgets/mise_a_jour_gate.dart",
  /kIntervallePollMiseAJour\s*=\s*Duration\(minutes:\s*([1-5])\)/,
  "mobile-poll-max-5min"
);
mustInclude(
  "apps/mobile_flutter/lib/utils/comparer_versions.dart",
  ["comparerVersions", "decideModeMiseAJour"],
  "mobile-compare"
);
mustInclude(
  "apps/web/src/app/layout.tsx",
  ["BanniereMiseAJour", "EnregistreurPwa"],
  "web-wiring"
);
mustInclude(
  "apps/web/src/components/BanniereMiseAJour.tsx",
  [
    "decideModeMiseAJour",
    "lireVersionsApp",
    "NEXT_PUBLIC_APP_VERSION",
    "EVENT_SW_UPDATE",
    "fixed",
    "EVENT_VERSIONS_MAJ",
    "INTERVALLE_POLL_VERSIONS_MS",
    "setInterval",
  ],
  "web-banner"
);
mustMatch(
  "apps/web/src/components/BanniereMiseAJour.tsx",
  /INTERVALLE_POLL_VERSIONS_MS\s*=\s*(\d+)/,
  "web-poll-const"
);
{
  const m = read("apps/web/src/components/BanniereMiseAJour.tsx").match(
    /INTERVALLE_POLL_VERSIONS_MS\s*=\s*(\d+)/
  );
  const ms = Number(m?.[1] || 999999);
  if (!(ms > 0 && ms <= 120_000)) {
    throw new Error(`[web-poll-max-120s] INTERVALLE_POLL_VERSIONS_MS=${ms} doit être ≤ 120000`);
  }
  console.log("  ✓ web-poll-max-120s");
}
mustInclude(
  "apps/web/src/components/EnregistreurPwa.tsx",
  ["EVENT_SW_UPDATE", "SKIP_WAITING", "appliquerMiseAJourPwa", "setInterval"],
  "web-pwa"
);
mustInclude("apps/web/public/sw.js", ["SKIP_WAITING", "reserva-admin"], "sw");
mustInclude(
  "apps/web/next.config.js",
  ["NEXT_PUBLIC_APP_VERSION"],
  "next-version"
);
mustInclude(
  "apps/api/src/routes/index.ts",
  ['"/app"', "routesAppVersions"],
  "api-route"
);
mustInclude(
  "apps/api/src/modules/app-versions/app-versions.routes.ts",
  ['"/versions"', "getVersions", "publier-seuils", "verifierSecretCron"],
  "api-versions"
);
mustInclude(
  "apps/api/src/modules/app-versions/app-versions.service.ts",
  ["publierSeuilsMonotones", "comparerVersions"],
  "api-monotone"
);
mustInclude(
  "apps/web/src/app/admin/versions/page.tsx",
  ["minSoft", "minForce", "mettreAJourVersionsApp"],
  "admin-ui"
);
mustInclude(
  "packages/shared/src/utils/helpers.ts",
  ["comparerVersions", "decideModeMiseAJour"],
  "shared-helpers"
);
mustInclude(
  "scripts/sync-app-versions-prod.mjs",
  ["publier-seuils", "--canaux", "GATEWAY_URL", "minSoft", "RENDER_API_KEY", "publier-seuils-db"],
  "sync-script"
);
mustInclude(
  "scripts/lib/publier-seuils-db.mjs",
  ["APP_VERSION_", "configurationTarification", "PAYLOAD_JSON"],
  "sync-db"
);
mustInclude(
  "package.json",
  ['"sync:app-versions"', '"check:update-banners"', '"ci:quality"'],
  "npm-scripts"
);
mustInclude(
  ".github/workflows/ci-cd.yml",
  ["sync:app-versions", "Publier seuils bannières MAJ", "ci:quality"],
  "ci-sync"
);
mustMatch("apps/mobile_flutter/pubspec.yaml", /^version:\s*\d+\.\d+\.\d+/m, "pubspec-version");
mustMatch("apps/web/package.json", /"version":\s*"\d+\.\d+\.\d+"/, "web-package-version");

console.log("✓ Bannières de mise à jour — wiring + poll + sync CI intacts");
