/**
 * Appelle le gateway prod comme l'app mobile (renvoi OTP) + lit logs Render.
 * Env: GATEWAY_URL, DIAG_SMS_PHONE, RENDER_*
 */
import crypto from "node:crypto";

const GATEWAY = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
const phoneRaw = process.env.DIAG_SMS_PHONE || "+243971163574";
const phone = phoneRaw.startsWith("+") ? phoneRaw : `+${phoneRaw.replace(/\D/g, "")}`;
const API = "https://api.render.com/v1";
const renderKey = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_CORE;

async function dumpLogs() {
  if (!renderKey || !serviceId) return;
  const headers = { Authorization: `Bearer ${renderKey}`, Accept: "application/json" };
  const svc = await fetch(`${API}/services/${serviceId}`, { headers }).then((r) => r.json());
  const ownerId = (svc.service || svc).ownerId;
  const end = new Date();
  const start = new Date(end.getTime() - 20 * 60 * 1000);
  const url = `${API}/logs?ownerId=${ownerId}&resource=${serviceId}&type=app&startTime=${encodeURIComponent(start.toISOString())}&endTime=${encodeURIComponent(end.toISOString())}&limit=100`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.log("logs", res.status);
    return;
  }
  const data = await res.json();
  const lines = (data.logs || [])
    .map((l) => l.message || "")
    .filter((m) => /OTP SMS|Hub SMS|MODE_SMS|AFRISOFT|envoyerOtp|sms\.afri/i.test(m));
  console.log("── Logs core (extrait OTP/SMS) ──");
  console.log(lines.slice(-50).join("\n") || "(vide)");
}

async function main() {
  if (!GATEWAY) throw new Error("GATEWAY_URL requis");
  console.log("→ Gateway", GATEWAY);
  console.log("→ POST /auth/otp/renvoyer", phone);

  const res = await fetch(`${GATEWAY}/auth/otp/renvoyer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telephone: phone }),
  });
  const json = await res.json().catch(() => ({}));
  console.log("  HTTP", res.status, JSON.stringify(json).slice(0, 500));

  // Si compte inexistant, tenter inscription minimale
  if (res.status === 404 || json?.erreur?.code === "NON_TROUVE") {
    console.log("→ Compte absent — POST /auth/inscription (CLIENT)");
    const res2 = await fetch(`${GATEWAY}/auth/inscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telephone: phone,
        nom: "Diag SMS",
        langue: "fr",
        role: "CLIENT",
      }),
    });
    const json2 = await res2.json().catch(() => ({}));
    console.log("  HTTP", res2.status, JSON.stringify(json2).slice(0, 500));
  }

  await new Promise((r) => setTimeout(r, 3000));
  await dumpLogs();

  // Indiquer MODE_SMS via un endpoint sante si exposé
  try {
    const sante = await fetch(`${GATEWAY}/sante`).then((r) => r.json());
    console.log("→ /sante", JSON.stringify(sante).slice(0, 300));
  } catch {
    /* ignore */
  }
}

main().catch((e) => {
  console.error("✗", e.message || e);
  process.exit(1);
});
