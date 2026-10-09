/**
 * Attend que les services Render soient live après un deploy déclenché.
 * Env: RENDER_API_KEY, RENDER_SERVICE_* (IDs), optionnel GATEWAY_URL pour ping.
 * Sur échec build : affiche un extrait des logs build.
 */
const API = "https://api.render.com/v1";
const key = process.env.RENDER_API_KEY;
const services = [
  ["core", process.env.RENDER_SERVICE_CORE],
  ["hotels", process.env.RENDER_SERVICE_HOTELS],
  ["transport", process.env.RENDER_SERVICE_TRANSPORT],
  ["booking", process.env.RENDER_SERVICE_BOOKING],
  ["gateway", process.env.RENDER_SERVICE_GATEWAY],
  ["web", process.env.RENDER_SERVICE_WEB],
].filter(([, id]) => id);

if (!key) {
  console.error("RENDER_API_KEY manquant");
  process.exit(1);
}
if (services.length === 0) {
  console.error("Aucun RENDER_SERVICE_* fourni");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };

async function dernierDeploy(serviceId) {
  const res = await fetch(`${API}/services/${serviceId}/deploys?limit=1`, { headers });
  if (!res.ok) throw new Error(`deploys ${serviceId} → ${res.status}`);
  const data = await res.json();
  const item = Array.isArray(data) ? data[0] : data;
  return item?.deploy || item;
}

async function ownerIdOf(serviceId) {
  const res = await fetch(`${API}/services/${serviceId}`, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  const s = data.service || data;
  return s.ownerId || null;
}

async function dumpLogs(serviceId, name, type) {
  try {
    const ownerId = await ownerIdOf(serviceId);
    if (!ownerId) return;
    const end = new Date();
    const start = new Date(end.getTime() - 15 * 60 * 1000);
    const url = `${API}/logs?ownerId=${ownerId}&resource=${serviceId}&type=${type}&startTime=${encodeURIComponent(start.toISOString())}&endTime=${encodeURIComponent(end.toISOString())}&limit=100`;
    const res = await fetch(url, { headers });
    if (!res.ok) return;
    const data = await res.json();
    const lines = (data.logs || []).map((l) => l.message).filter(Boolean);
    if (!lines.length) return;
    console.error(`\n── Logs ${type} ${name} (extrait) ──`);
    console.error(lines.slice(-50).join("\n"));
  } catch (e) {
    console.error(`  (logs ${type} ${name} indisponibles: ${e.message})`);
  }
}

async function dumpFailureLogs(serviceId, name) {
  await dumpLogs(serviceId, name, "build");
  await dumpLogs(serviceId, name, "app");
}

async function main() {
  const maxMs = Number(process.env.RENDER_WAIT_MS || 15 * 60 * 1000);
  const start = Date.now();
  console.log(`→ Attente Render ready (${services.length} services, max ${Math.round(maxMs / 60000)} min)`);

  const pending = new Map(services);
  while (pending.size > 0) {
    if (Date.now() - start > maxMs) {
      console.error("Timeout Render. Restants:", [...pending.keys()].join(", "));
      for (const [name, id] of pending) await dumpFailureLogs(id, name);
      process.exit(1);
    }
    for (const [name, id] of [...pending.entries()]) {
      try {
        const d = await dernierDeploy(id);
        const status = d?.status || "unknown";
        console.log(`  ${name}: ${status}`);
        if (status === "live") pending.delete(name);
        if (["build_failed", "update_failed", "canceled", "deactivated"].includes(status)) {
          await dumpFailureLogs(id, name);
          throw new Error(`Deploy ${name} en échec: ${status}`);
        }
      } catch (e) {
        console.error(`  ${name}: ${e.message}`);
        if (/échec|build_failed|update_failed/.test(String(e.message))) throw e;
      }
    }
    if (pending.size === 0) break;
    await new Promise((r) => setTimeout(r, 15000));
  }

  const gateway = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
  if (gateway) {
    const pingPaths = gateway.endsWith("/api")
      ? [`${gateway}/sante`]
      : [`${gateway}/api/sante`, `${gateway}/sante`];
    console.log("→ Ping gateway", pingPaths[0]);
    let ok = false;
    for (let i = 1; i <= 24; i++) {
      for (const url of pingPaths) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            console.log(`  gateway OK ${url} (tentative ${i})`);
            ok = true;
            break;
          }
        } catch {
          /* retry */
        }
      }
      if (ok) break;
      if (i === 24) throw new Error("Gateway URL non joignable après Render live");
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  console.log("✓ Render ready");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
