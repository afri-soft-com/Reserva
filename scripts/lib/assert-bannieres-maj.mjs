/**
 * Assertions partagées : /app/versions doit rester utilisable par les bannières
 * après tout déploiement. Utilisé par smoke prod + sync-app-versions-prod.
 */

function cmpVer(a, b) {
  const parts = (v) =>
    String(v || "0")
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map((n) => parseInt(n, 10));
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function decideMode(versionInstallee, minSoft, minForce) {
  if (cmpVer(versionInstallee, minForce) < 0) return "force";
  if (cmpVer(versionInstallee, minSoft) < 0) return "soft";
  return "none";
}

/**
 * @param {Record<string, any>} versions — objet { client, pro, web }
 * @param {{ exigerStoreUrls?: boolean, minSoftAttendu?: Record<string, string> }} [opts]
 */
export function assertConfigBannieres(versions, opts = {}) {
  const exigerStoreUrls = opts.exigerStoreUrls !== false;
  if (!versions || typeof versions !== "object") {
    throw new Error("bannières MAJ: réponse /app/versions vide");
  }

  for (const canal of ["client", "pro", "web"]) {
    const cfg = versions[canal];
    if (!cfg?.minSoft || !cfg?.minForce) {
      throw new Error(`bannières MAJ: canal ${canal} incomplet (minSoft/minForce requis)`);
    }
    if (cmpVer(cfg.minForce, cfg.minSoft) > 0) {
      throw new Error(
        `bannières MAJ: ${canal} minForce (${cfg.minForce}) > minSoft (${cfg.minSoft}) — invariant cassé`
      );
    }
  }

  if (exigerStoreUrls) {
    for (const canal of ["client", "pro"]) {
      const cfg = versions[canal];
      if (!String(cfg.storeUrlAndroid || "").trim()) {
        throw new Error(`bannières MAJ: ${canal}.storeUrlAndroid manquant (CTA store cassé)`);
      }
      if (!String(cfg.storeUrlIos || "").trim()) {
        throw new Error(`bannières MAJ: ${canal}.storeUrlIos manquant (CTA store cassé)`);
      }
    }
  }

  // Auto-test logique : une version sous minForce → force ; entre force et soft → soft ; ≥ soft → none
  const c = versions.client;
  const sousForce = decideMode("0.0.1", c.minSoft, c.minForce);
  if (sousForce !== "force") {
    throw new Error(`bannières MAJ: attendu force pour 0.0.1 vs force=${c.minForce}, got ${sousForce}`);
  }
  if (cmpVer(c.minSoft, c.minForce) > 0) {
    const softOnly = decideMode(c.minForce, c.minSoft, c.minForce);
    if (softOnly !== "soft" && softOnly !== "none") {
      throw new Error(`bannières MAJ: mode inattendu ${softOnly} pour version=minForce`);
    }
    // Si minForce < minSoft, être exactement sur minForce doit donner soft
    if (cmpVer(c.minForce, c.minSoft) < 0 && softOnly !== "soft") {
      throw new Error(
        `bannières MAJ: version=${c.minForce} devrait être soft (minSoft=${c.minSoft}), got ${softOnly}`
      );
    }
  }
  const aJour = decideMode(c.minSoft, c.minSoft, c.minForce);
  if (aJour !== "none") {
    throw new Error(`bannières MAJ: version=minSoft devrait être none, got ${aJour}`);
  }

  if (opts.minSoftAttendu) {
    for (const [canal, ver] of Object.entries(opts.minSoftAttendu)) {
      const got = versions[canal]?.minSoft;
      if (!got || cmpVer(got, ver) < 0) {
        throw new Error(
          `bannières MAJ: ${canal}.minSoft=${got || "?"} < version publiée ${ver} (sync incomplet)`
        );
      }
    }
  }
}

export { cmpVer, decideMode };
