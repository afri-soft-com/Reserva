import crypto from "node:crypto";
import { env } from "../../config/env";

/**
 * Client hub AfriSoft SMS — HMAC uniquement côté serveur.
 * Doc : POST https://sms.afri-soft.com/v1/sms/send
 */

export function telephonePourHub(telephone: string): string {
  const chiffres = telephone.replace(/\D/g, "");
  if (chiffres.startsWith("243") && chiffres.length === 12) return chiffres;
  if (chiffres.startsWith("0") && chiffres.length === 10) return `243${chiffres.slice(1)}`;
  if (chiffres.length === 9) return `243${chiffres}`;
  return chiffres;
}

export async function envoyerSmsViaHubAfriSoft(params: {
  telephone: string;
  text: string;
  purpose?: string;
}): Promise<{ succes: boolean; referenceExterne?: string; status?: string }> {
  const base = env.AFRISOFT_SMS_HUB_URL.replace(/\/$/, "");
  const appId = env.AFRISOFT_HUB_APP_ID;
  const apiKey = env.AFRISOFT_HUB_API_KEY;
  if (!appId || !apiKey) {
    throw new Error("AFRISOFT_HUB_APP_ID / AFRISOFT_HUB_API_KEY manquants");
  }

  const path = "/v1/sms/send";
  const phone = telephonePourHub(params.telephone);
  const reference = `${appId}_${params.purpose || "sms"}_${crypto.randomUUID()}`;
  const idempotencyKey = `${appId}:${params.purpose || "sms"}:${phone}:${Math.floor(Date.now() / 60000)}`;
  const bodyObj = {
    app_id: appId,
    phone,
    text: params.text.slice(0, 640),
    reference,
    idempotency_key: idempotencyKey,
  };
  const body = JSON.stringify(bodyObj);
  const ts = String(Math.floor(Date.now() / 1000));
  const stringToSign = `${ts}.POST.${path}.${body}`;
  const signature = crypto.createHmac("sha256", apiKey).update(stringToSign).digest("hex");

  const res = await fetch(`${base}${path}`, {
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

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = json.code || json.message || res.statusText;
    throw new Error(`Hub SMS ${res.status}: ${code}`);
  }

  return {
    succes: String(json.status || "").toUpperCase() === "SENT" || !!json.sms_id,
    referenceExterne: String(json.sms_id || reference),
    status: String(json.status || ""),
  };
}
