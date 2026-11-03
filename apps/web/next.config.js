const pkg = require("./package.json");

function cmpVer(a, b) {
  const parts = (v) =>
    String(v || "0")
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map((n) => parseInt(n, 10));
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

/** La version du package prime sur un NEXT_PUBLIC_APP_VERSION Render resté en arrière. */
function versionPubliee() {
  const env = process.env.NEXT_PUBLIC_APP_VERSION;
  if (!env) return pkg.version;
  if (!pkg.version) return env;
  return cmpVer(pkg.version, env) >= 0 ? pkg.version : env;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Utilisé par BanniereMiseAJour — ≥ minSoft masque la bannière après rechargement.
    NEXT_PUBLIC_APP_VERSION: versionPubliee(),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
