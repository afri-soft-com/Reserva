/**
 * Garde-fou CI : les bannières de mise à jour (mobile + web) restent câblées.
 * Échoue si un futur refactor retire le wiring ou l'endpoint public.
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
  ["ApiAppVersions", "decideModeMiseAJour", "minSoft", "minForce"],
  "mobile-gate"
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
  ["decideModeMiseAJour", "lireVersionsApp", "NEXT_PUBLIC_APP_VERSION", "EVENT_SW_UPDATE"],
  "web-banner"
);
mustInclude(
  "apps/web/src/components/EnregistreurPwa.tsx",
  ["EVENT_SW_UPDATE", "SKIP_WAITING", "appliquerMiseAJourPwa"],
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
  ['"/versions"', "getVersions"],
  "api-versions"
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

mustMatch("apps/mobile_flutter/pubspec.yaml", /^version:\s*\d+\.\d+\.\d+/m, "pubspec-version");
mustMatch("apps/web/package.json", /"version":\s*"\d+\.\d+\.\d+"/, "web-package-version");

console.log("✓ Bannières de mise à jour — wiring intact");
