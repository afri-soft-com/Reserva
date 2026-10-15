/**
 * Diagnostic SMS OTP prod : lit les logs Render core ([OTP SMS]) + ping hub SMS send (dry).
 * Secrets: RENDER_API_KEY, RENDER_SERVICE_CORE, AFRISOFT_HUB_*
 * Optionnel: DIAG_SMS_PHONE=+2439... (sinon ping auth seul)
 */
import crypto from "node:crypto";

const API = "https://api.render.com/v1";
const key = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_CORE;
const appId = (process.env.AFRISOFT_HUB_APP_ID || "").trim().toLowerCase();
const apiKey = (process.env.AFRISOFT_HUB_API_KEY || "").trim();
const smsHub = (process.env.AFRISOFT_SMS_HUB_URL || "https://sms.afri-soft.com").replace(/\/$/, "");
const phoneDiag = (process.env.DIAG_SMS_PHONE || "").replace(/\D/g, "");

const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };

async function ownerIdOf(serviceId) {
  const res = await fetch(`${API}/services/${serviceId}`, { headers });
  if (!res.ok) throw new Error(`service ${res.status}`);
  const data = await res.json();
  const s = data.service || data;
  return s.ownerId;
}

async function dumpOtpLogs() {
  if (!key || !serviceId) {
    console.log("⚠ RENDER_* absents — skip logs");
    return;
  }
  const ownerId = await ownerIdOf(serviceId);
  const end = new Date();
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  const url = `${API}/logs?ownerId=${ownerId}&resource=${serviceId}&type=app&startTime=${encodeURIComponent(start.toISOString())}&endTime=${encodeURIComponent(end.toISOString())}&limit=100`;
  console.log("→ Logs Render core (60 min)");
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.log(`  ⚠ logs HTTP ${res.status}`);
    return;
  }
  const data = await res.json();
  const lines = (data.logs || [])
    .map((l) => l.message || "")
    .filter((m) => /OTP SMS|SMS |MODE_SMS|Hub SMS|afrisoft/i.test(m));
  if (!lines.length) {
    console.log("  (aucune ligne OTP/SMS récente — retentez « Recevoir le SMS » puis relancez ce diagnostic)");
    return;
  }
  console.log(lines.slice(-40).join("\n"));
}

function signer(secret, ts, method, path, body) {
  return crypto.createHmac("sha256", secret).update(`${ts}.${method}.${path}.${body}`).digest("hex");
}

async function probeHubSend() {
  if (!appId || !apiKey) {
    console.log("⚠ AFRISOFT_HUB_* absents — skip probe send");
    return;
  }
  const path = "/v1/sms/send";
  const phone = phoneDiag.length >= 9 ? (phoneDiag.startsWith("243") ? phoneDiag : `243${phoneDiag.replace(/^0/, "")}`) : "243900000099";
  const isDemo = phone.startsWith("2439000000");
  console.log(`→ Probe POST ${smsHub}${path} phone=${phone}${isDemo ? " (démo — attendu refus opérateur possible)" : ""}`);

  const bodyObj = {
    app_id: appId,
    phone,
    text: "RESERVA diagnostic: ignore.",
    reference: `${appId}_diag_${crypto.randomUUID()}`,
    idempotency_key: `${appId}:diag:${phone}:${Math.floor(Date.now() / 60000)}`,
  };
  const body = JSON.stringify(bodyObj);
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = signer(apiKey, ts, "POST", path, body);
  const res = await fetch(`${smsHub}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AfriSoft-App-Id": appId,
      "X-AfriSoft-Api-Key": apiKey,
      "X-AfriSoft-Timestamp": ts,
      "X-AfriSoft-Signature": signature,
    },
    body,
  });
  const json = await res.json().catch(() => ({}));
  console.log(`  HTTP ${res.status}`, JSON.stringify(json).slice(0, 400));
  if (res.status === 401 || res.status === 403) {
    throw new Error("Auth hub refusée — AFRISOFT_HUB_APP_ID / API_KEY invalides pour sms.afri-soft.com");
  }
  if (!res.ok) {
    console.log("  → Cause probable côté hub:", json.code || json.message || res.statusText);
  } else {
    console.log("  ✓ Hub a accepté l'envoi (status=", json.status || "?", ")");
  }
}

async function main() {
  console.log("→ Diagnostic SMS OTP RESERVA");
  await dumpOtpLogs();
  await probeHubSend();
  console.log("✓ Diagnostic terminé");
}

main().catch((e) => {
  console.error("✗", e.message || e);
  process.exit(1);
});
