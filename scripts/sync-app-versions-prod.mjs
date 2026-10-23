#!/usr/bin/env node
/**
 * Seuils bannières MAJ (prod).
 *
 * Par défaut (CI post-deploy) : --verify-only
 *   → vérifie que /app/versions est sain (URLs, invariants)
 *   → NE MONTE PAS minSoft (un deploy ne doit plus « éteindre » les bannières
 *     en alignant le seuil sur la version tout juste installée par les testeurs)
 *
 * Promotion volontaire des seuils :
 *   node scripts/sync-app-versions-prod.mjs --canaux=mobile --bump-min-soft
 *   node scripts/sync-app-versions-prod.mjs --canaux=web --bump-min-soft
 *
 * Auth (bump) : CRON_SECRET | SMOKE_ADMIN_* | RENDER_API_KEY
 * Env: GATEWAY_URL
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertConfigBannieres, cmpVer } from "./lib/assert-bannieres-maj.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gateway = (process.env.GATEWAY_URL || "https://reserva-gateway.onrender.com/api").replace(/\/$/, "");
const RENDER_API = "https://api.render.com/v1";

const bumpMinSoft = process.argv.includes("--bump-min-soft");
const verifyOnly = process.argv.includes("--verify-only") || !bumpMinSoft;

function argCanaux() {
  const raw = process.argv.find((a) => a.startsWith("--canaux="))?.split("=")[1] || "all";
  if (raw === "all") return ["client", "pro", "web"];
  if (raw === "mobile") return ["client", "pro"];
  if (raw === "web") return ["web"];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function lireVersionPubspec() {
  const t = fs.readFileSync(path.join(racine, "apps/mobile_flutter/pubspec.yaml"), "utf8");
  const m = t.match(/^version:\s*([0-9]+\.[0-9]+\.[0-9]+)/m);
  if (!m) throw new Error("version introuvable dans pubspec.yaml");
  return m[1];
}

function lireVersionWeb() {
  const pkg = JSON.parse(fs.readFileSync(path.join(racine, "apps/web/package.json"), "utf8"));
  if (!pkg.version) throw new Error("version introuvable dans apps/web/package.json");
  return String(pkg.version);
}

async function loginAdmin() {
  const phone = process.env.SMOKE_ADMIN_PHONE;
  const pin = process.env.SMOKE_ADMIN_PIN;
  if (!phone || !pin) return null;
  const res = await fetch(`${gateway}/auth/connexion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telephone: phone, pin }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.succes === false) {
    throw new Error(`Login admin → ${res.status} ${json?.erreur?.message || ""}`);
  }
  return json.donnees?.token || json.donnees?.accessToken || json.token;
}

async function publier(payload, { cronSecret, token }) {
  if (cronSecret) {
    const res = await fetch(`${gateway}/app/cron/publier-seuils`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cron-Secret": cronSecret,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.succes === false) {
      throw new Error(`cron publier-seuils → ${res.status} ${json?.erreur?.message || ""}`);
    }
    return json.donnees ?? json;
  }

  if (!token) throw new Error("Ni CRON_SECRET ni credentials admin disponibles");

  const getRes = await fetch(`${gateway}/app/versions`);
  const getJson = await getRes.json().catch(() => ({}));
  const actuel = getJson.donnees ?? getJson;
  const body = {};
  const modifications = [];
  for (const canal of Object.keys(payload)) {
    const cur = actuel[canal] || {};
    const dem = payload[canal];
    let soft = cur.minSoft || "0.0.0";
    let force = cur.minForce || "0.0.0";
    if (cmpVer(dem.minSoft, soft) > 0) {
      if (cmpVer(soft, force) > 0) force = soft;
      modifications.push(`${canal}.minSoft ${soft} → ${dem.minSoft}`);
      soft = dem.minSoft;
    }
    if (dem.minForce && cmpVer(dem.minForce, force) > 0) {
      modifications.push(`${canal}.minForce ${force} → ${dem.minForce}`);
      force = dem.minForce;
    }
    if (canal === "web") {
      body[canal] = { minSoft: soft, minForce: force };
    } else {
      body[canal] = {
        minSoft: soft,
        minForce: force,
        storeUrlAndroid: cur.storeUrlAndroid ?? "",
        storeUrlIos: cur.storeUrlIos ?? "",
      };
    }
  }
  if (modifications.length === 0) {
    console.log("  rien à monter (seuils déjà ≥ versions demandées)");
    return { apres: actuel, modifications: [] };
  }
  const res = await fetch(`${gateway}/app/versions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.succes === false) {
    throw new Error(`PUT /app/versions → ${res.status} ${json?.erreur?.message || ""}`);
  }
  return { apres: json.donnees ?? json, modifications };
}

async function publierViaRenderDb(payload) {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error("RENDER_API_KEY manquant");
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  const listRes = await fetch(`${RENDER_API}/postgres?limit=50`, { headers });
  if (!listRes.ok) throw new Error(`list postgres → ${listRes.status}`);
  const list = await listRes.json();
  const hit = (Array.isArray(list) ? list : []).find((x) => (x.postgres || x).name === "reserva-db");
  const pg = hit?.postgres || hit;
  if (!pg?.id) throw new Error("Postgres reserva-db introuvable");
  const infoRes = await fetch(`${RENDER_API}/postgres/${pg.id}/connection-info`, { headers });
  if (!infoRes.ok) throw new Error(`connection-info → ${infoRes.status}`);
  const info = await infoRes.json();
  const base = info.externalConnectionString;
  if (!base) throw new Error("externalConnectionString manquant");
  const u = new URL(base);
  u.searchParams.set("schema", "core");
  const r = spawnSync("node", ["scripts/lib/publier-seuils-db.mjs"], {
    cwd: racine,
    env: { ...process.env, DATABASE_URL: u.toString(), PAYLOAD_JSON: JSON.stringify(payload) },
    encoding: "utf8",
    shell: true,
  });
  if (r.stdout?.trim()) console.log(r.stdout.trim());
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || `publier-seuils-db exit ${r.status}`);
  }
  let modifications = [];
  try {
    modifications = JSON.parse(r.stdout.trim().split("\n").pop() || "{}").modifications || [];
  } catch {
    /* ignore */
  }
  return { modifications };
}

async function lireVersionsProd() {
  const getRes = await fetch(`${gateway}/app/versions`);
  if (!getRes.ok) throw new Error(`GET /app/versions → ${getRes.status}`);
  const getJson = await getRes.json();
  return getJson.donnees ?? getJson;
}

async function verifierSante(canaux, mobileVer, webVer) {
  const apres = await lireVersionsProd();
  assertConfigBannieres(apres, {
    exigerStoreUrls: canaux.includes("client") || canaux.includes("pro"),
    // Ne PAS exiger minSoft ≥ version pubspec : le deploy ne force plus la hausse.
  });

  for (const canal of canaux) {
    const publiee = canal === "web" ? webVer : mobileVer;
    const soft = apres[canal]?.minSoft;
    if (soft && cmpVer(publiee, soft) > 0) {
      console.log(
        `  ℹ ${canal}: build ${publiee} > minSoft ${soft} — bannières soft actives pour les builds < ${soft}.`,
        `Pour pousser la MAJ vers ${publiee}: sync avec --bump-min-soft (ou Admin → Versions).`
      );
    } else if (soft && cmpVer(publiee, soft) === 0) {
      console.log(
        `  ℹ ${canal}: minSoft=${soft} = version build — pas de bannière soft sur ce build (normal).`
      );
    }
  }

  console.log(
    "  vérifié OK — client≥",
    apres.client?.minSoft,
    "pro≥",
    apres.pro?.minSoft,
    "web≥",
    apres.web?.minSoft
  );
  return apres;
}

async function main() {
  const canaux = argCanaux();
  const mobileVer = lireVersionPubspec();
  const webVer = lireVersionWeb();

  if (verifyOnly && !bumpMinSoft) {
    console.log("→ Vérif bannières MAJ (sans monter les seuils)", gateway, { canaux, mobileVer, webVer });
    await verifierSante(canaux, mobileVer, webVer);
    console.log("✓ Bannières intactes — aucun seuil modifié par ce déploiement");
    return;
  }

  const payload = {};
  if (canaux.includes("client")) payload.client = { minSoft: mobileVer };
  if (canaux.includes("pro")) payload.pro = { minSoft: mobileVer };
  if (canaux.includes("web")) payload.web = { minSoft: webVer };

  console.log("→ Bump minSoft bannières", gateway, payload);

  const cronSecret = (process.env.CRON_SECRET || "").trim();
  let resultat;
  try {
    let token = null;
    if (!cronSecret) {
      try {
        token = await loginAdmin();
      } catch (e) {
        console.log("  admin login indisponible:", e.message);
      }
    }
    if (cronSecret || token) {
      resultat = await publier(payload, { cronSecret: cronSecret || null, token });
    } else {
      throw new Error("pas de cron/admin");
    }
  } catch (e) {
    console.log("  fallback Render DB:", e.message);
    resultat = await publierViaRenderDb(payload);
  }

  console.log("✓ Seuils publiés", JSON.stringify(resultat.modifications || resultat).slice(0, 300));

  const apres = await lireVersionsProd();
  const minSoftAttendu = {};
  if (canaux.includes("client")) minSoftAttendu.client = mobileVer;
  if (canaux.includes("pro")) minSoftAttendu.pro = mobileVer;
  if (canaux.includes("web")) minSoftAttendu.web = webVer;
  assertConfigBannieres(apres, {
    exigerStoreUrls: canaux.includes("client") || canaux.includes("pro"),
    minSoftAttendu,
  });
  console.log(
    "  vérifié OK — client≥",
    apres.client?.minSoft,
    "pro≥",
    apres.pro?.minSoft,
    "web≥",
    apres.web?.minSoft
  );
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
