#!/usr/bin/env node
/**
 * Après un upload store réussi : aligne minSoft sur la version PUBLIÉE (pubspec),
 * sans jamais la monter « en avance » (ce qui laissait les bannières collées).
 *
 * Règle produit :
 * - minSoft := max(minSoft actuel, versionPubliée)
 * - minForce reste < minSoft (abaissé si besoin)
 * → les installs < versionPubliée voient soft ; la dernière build ne voit rien (normal).
 *
 * Usage:
 *   node scripts/promote-bannieres-apres-store.mjs
 *   node scripts/promote-bannieres-apres-store.mjs --version=1.0.7
 *   node scripts/promote-bannieres-apres-store.mjs --canaux=client,pro
 *
 * Env: GATEWAY_URL, SMOKE_ADMIN_PHONE, SMOKE_ADMIN_PIN
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertConfigBannieres, cmpVer } from "./lib/assert-bannieres-maj.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gateway = (process.env.GATEWAY_URL || "https://reserva-gateway.onrender.com/api").replace(/\/$/, "");

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : def;
}

function lireVersionPubspec() {
  const t = fs.readFileSync(path.join(racine, "apps/mobile_flutter/pubspec.yaml"), "utf8");
  const m = t.match(/^\s*version:\s*([^\s+]+)/m);
  if (!m) throw new Error("version introuvable dans pubspec.yaml");
  return m[1].trim();
}

function forceSousSoft(soft) {
  const p = String(soft)
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((n) => parseInt(n, 10));
  while (p.length < 3) p.push(0);
  if (p[2] > 0) p[2] -= 1;
  else if (p[1] > 0) {
    p[1] -= 1;
    p[2] = 0;
  } else if (p[0] > 0) {
    p[0] -= 1;
    p[1] = 0;
    p[2] = 0;
  }
  return p.join(".");
}

function maxVer(a, b) {
  return cmpVer(a, b) >= 0 ? a : b;
}

function minVer(a, b) {
  return cmpVer(a, b) <= 0 ? a : b;
}

async function main() {
  const phone = process.env.SMOKE_ADMIN_PHONE;
  const pin = process.env.SMOKE_ADMIN_PIN;
  if (!phone || !pin) throw new Error("SMOKE_ADMIN_PHONE / SMOKE_ADMIN_PIN requis");

  const publiee = arg("version", lireVersionPubspec());
  const canaux = String(arg("canaux", "client,pro"))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`→ Promotion bannières après store — version publiée ${publiee} (${canaux.join(", ")})`);

  const login = await fetch(`${gateway}/auth/connexion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telephone: phone, pin }),
  });
  const loginJson = await login.json().catch(() => ({}));
  if (!login.ok || loginJson.succes === false) {
    throw new Error(`login → ${login.status} ${loginJson?.erreur?.message || ""}`);
  }
  const token = loginJson.donnees?.token || loginJson.donnees?.accessToken || loginJson.token;
  if (!token) throw new Error("token admin manquant");

  const getRes = await fetch(`${gateway}/app/versions`);
  const getJson = await getRes.json();
  const actuel = getJson.donnees ?? getJson;

  const body = {
    client: { ...actuel.client },
    pro: { ...actuel.pro },
    web: { ...actuel.web },
  };

  const mods = [];
  for (const canal of canaux) {
    if (!body[canal]) body[canal] = {};
    const avantSoft = body[canal].minSoft || "0.0.0";
    const avantForce = body[canal].minForce || "0.0.0";

    // Ne jamais monter au-dessus de la version publiée (évite soft collé après MAJ store).
    if (cmpVer(avantSoft, publiee) > 0) {
      body[canal].minSoft = publiee;
      mods.push(`${canal}.minSoft ${avantSoft} → ${publiee} (recul : était en avance sur le store)`);
    } else {
      const soft = maxVer(avantSoft, publiee);
      if (soft !== avantSoft) {
        body[canal].minSoft = soft;
        mods.push(`${canal}.minSoft ${avantSoft} → ${soft}`);
      } else {
        body[canal].minSoft = avantSoft;
      }
    }

    const softFinal = body[canal].minSoft;
    let force = avantForce;
    if (cmpVer(force, softFinal) >= 0) {
      force = forceSousSoft(softFinal);
      mods.push(`${canal}.minForce ${avantForce} → ${force}`);
    }
    // Ne pas remonter minForce automatiquement (conserve un filet large).
    body[canal].minForce = minVer(force, softFinal) === force ? force : forceSousSoft(softFinal);
    if (cmpVer(body[canal].minForce, softFinal) >= 0) {
      body[canal].minForce = forceSousSoft(softFinal);
    }

    if (canal === "client" || canal === "pro") {
      body[canal].storeUrlAndroid = body[canal].storeUrlAndroid || "";
      body[canal].storeUrlIos = body[canal].storeUrlIos || "";
    }
  }

  if (mods.length === 0) {
    console.log(`✓ Déjà aligné (minSoft ≥ ${publiee} et ≤ publiée). Aucun PUT.`);
    assertConfigBannieres(actuel, { exigerStoreUrls: true });
    return;
  }

  console.log("→ Modifications:", mods.join("; "));
  const put = await fetch(`${gateway}/app/versions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      client: body.client,
      pro: body.pro,
      web: body.web,
    }),
  });
  const putJson = await put.json().catch(() => ({}));
  if (!put.ok || putJson.succes === false) {
    throw new Error(`PUT → ${put.status} ${putJson?.erreur?.message || JSON.stringify(putJson)}`);
  }
  const apres = putJson.donnees ?? putJson;
  assertConfigBannieres(apres, {
    exigerStoreUrls: true,
    minSoftAttendu: Object.fromEntries(canaux.filter((c) => c !== "web").map((c) => [c, publiee])),
  });
  for (const canal of canaux) {
    if (canal === "web") continue;
    const soft = apres[canal]?.minSoft;
    if (cmpVer(soft, publiee) > 0) {
      throw new Error(
        `bannières MAJ: ${canal}.minSoft=${soft} > publiée ${publiee} (bannière collée après MAJ)`
      );
    }
  }
  console.log(
    "✓ Bannières stables:",
    `client=${apres.client?.minSoft}/${apres.client?.minForce}`,
    `pro=${apres.pro?.minSoft}/${apres.pro?.minForce}`
  );
  console.log(`  → soft pour installs < ${publiee} ; none sur ${publiee}+`);
}

main().catch((e) => {
  console.error("✗", e.message || e);
  process.exit(1);
});
