#!/usr/bin/env node
/**
 * Pose des seuils ABSOLUS (peut baisser) via PUT admin /app/versions.
 * Usage:
 *   node scripts/set-app-versions-prod.mjs --client=1.0.3 --pro=1.0.3 --web=1.0.1
 *   node scripts/set-app-versions-prod.mjs --client-soft=1.0.3 --client-force=1.0.2 ...
 *
 * Env: GATEWAY_URL, SMOKE_ADMIN_PHONE, SMOKE_ADMIN_PIN
 */
const gateway = (process.env.GATEWAY_URL || "https://reserva-gateway.onrender.com/api").replace(/\/$/, "");

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : def;
}

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

/** force = patch inférieur à soft (ex 1.0.3 → 1.0.2), plancher 1.0.0 */
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

async function main() {
  const phone = process.env.SMOKE_ADMIN_PHONE;
  const pin = process.env.SMOKE_ADMIN_PIN;
  if (!phone || !pin) throw new Error("SMOKE_ADMIN_PHONE / SMOKE_ADMIN_PIN requis");

  const clientSoft = arg("client-soft", arg("client", "1.0.3"));
  const proSoft = arg("pro-soft", arg("pro", clientSoft));
  const webSoft = arg("web-soft", arg("web", "1.0.1"));
  const clientForce = arg("client-force", forceSousSoft(clientSoft));
  const proForce = arg("pro-force", forceSousSoft(proSoft));
  const webForce = arg("web-force", forceSousSoft(webSoft));

  for (const [label, soft, force] of [
    ["client", clientSoft, clientForce],
    ["pro", proSoft, proForce],
    ["web", webSoft, webForce],
  ]) {
    if (cmpVer(force, soft) > 0) throw new Error(`${label}: force ${force} > soft ${soft}`);
  }

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
    client: {
      minSoft: clientSoft,
      minForce: clientForce,
      storeUrlAndroid: actuel.client?.storeUrlAndroid || "",
      storeUrlIos: actuel.client?.storeUrlIos || "",
    },
    pro: {
      minSoft: proSoft,
      minForce: proForce,
      storeUrlAndroid: actuel.pro?.storeUrlAndroid || "",
      storeUrlIos: actuel.pro?.storeUrlIos || "",
    },
    web: {
      minSoft: webSoft,
      minForce: webForce,
    },
  };

  console.log("→ SET seuils absolus", JSON.stringify(body));

  const put = await fetch(`${gateway}/app/versions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const putJson = await put.json().catch(() => ({}));
  if (!put.ok || putJson.succes === false) {
    throw new Error(`PUT → ${put.status} ${putJson?.erreur?.message || JSON.stringify(putJson)}`);
  }
  console.log("✓ Seuils posés", JSON.stringify(putJson.donnees ?? putJson).slice(0, 400));
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
