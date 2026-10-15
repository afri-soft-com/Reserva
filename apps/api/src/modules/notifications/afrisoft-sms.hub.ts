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

const RETRYABLE_HUB = new Set([408, 425, 429, 500, 502, 503, 504]);

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
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
  const maxAttempts = 4;
  let lastErr: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const reference = `${appId}_${params.purpose || "sms"}_${crypto.randomUUID()}`;
    // Nouvelle clé par tentative pour éviter un 503 idempotent figé sur la minute.
    const idempotencyKey = `${appId}:${params.purpose || "sms"}:${phone}:${Math.floor(Date.now() / 60000)}:a${attempt}`;
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

    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AfriSoft-App-Id": appId,
          "X-AfriSoft-Api-Key": apiKey,
          "X-AfriSoft-Timestamp": ts,
          "X-AfriSoft-Signature": signature,
        },
        body,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      console.error(`[Hub SMS] réseau ${base} tentative ${attempt}/${maxAttempts}:`, lastErr.message);
      if (attempt < maxAttempts) {
        await sleep(800 * attempt);
        continue;
      }
      throw lastErr;
    }

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) {
      return {
        succes: String(json.status || "").toUpperCase() === "SENT" || !!json.sms_id,
        referenceExterne: String(json.sms_id || reference),
        status: String(json.status || ""),
      };
    }

    const errObj = (json.error && typeof json.error === "object" ? json.error : {}) as Record<
      string,
      unknown
    >;
    const code = errObj.code || json.code || errObj.message || json.message || res.statusText;
    const detail = errObj.message || json.message || "";
    lastErr = new Error(`Hub SMS ${res.status}: ${code}${detail && detail !== code ? ` — ${detail}` : ""}`);
    // Erreurs contenu / provider (ex. MOVA_INT_001 SerdiPay 400) : pas de retry inutile.
    const providerContentFail =
      String(code).startsWith("MOVA_") ||
      /SerdiPay\s*\(400\)/i.test(String(detail)) ||
      /error occor/i.test(String(detail));
    const retryable = RETRYABLE_HUB.has(res.status) && !providerContentFail;
    console.error(
      `[Hub SMS] ${res.status} ${base} phone=${phone} attempt=${attempt}/${maxAttempts}`,
      JSON.stringify(json).slice(0, 280)
    );
    if (!retryable || attempt === maxAttempts) throw lastErr;
    await sleep(1000 * attempt);
  }

  throw lastErr || new Error("Hub SMS: échec inconnu");
}
