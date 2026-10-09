import crypto from "node:crypto";
import { env } from "../../config/env";
import { OperateurMobileMoney } from "@reserva/shared";
import { telephonePourHub } from "../notifications/afrisoft-sms.hub";

/**
 * Client hub AfriSoft Paiements — HMAC serveur uniquement.
 * Doc : https://pay.afri-soft.com — POST /v1/payments | /v1/payouts
 */

const MAX_SKEW_SEC = 300;

export type StatutHubPaiement = "PENDING" | "COMPLETED" | "FAILED";

export interface ResultatHubPaiement {
  succes: boolean;
  enAttente?: boolean;
  paymentId?: string;
  reference?: string;
  providerRef?: string;
  paymentUrl?: string;
  statut?: StatutHubPaiement;
  amountCdf?: number;
  message?: string;
}

function telecomDepuisOperateur(operateur: OperateurMobileMoney): string {
  switch (operateur) {
    case "MPESA":
      return "MP";
    case "AIRTEL_MONEY":
      return "AM";
    case "ORANGE_MONEY":
      return "OM";
    default:
      throw new Error(`Opérateur Mobile Money non supporté par le hub : ${operateur}`);
  }
}

export function signerAfriSoftHub(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  rawBody: string
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${method.toUpperCase()}.${path}.${rawBody}`)
    .digest("hex");
}

export function cheminPublicWebhook(originalUrl: string): string {
  const path = (originalUrl.split("?")[0] || "/").trim() || "/";
  if (path.startsWith("/api/v1/")) return path.slice(4);
  return path;
}

export function verifierSignatureWebhookAfriSoft(params: {
  secret: string;
  timestamp: string;
  method: string;
  path: string;
  rawBody: string;
  signature: string;
}): boolean {
  const ts = Number(params.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > MAX_SKEW_SEC) return false;

  const publicPath = cheminPublicWebhook(params.path);
  const candidates = [publicPath];
  if (publicPath !== params.path) {
    candidates.push(params.path.split("?")[0]);
  }

  const provided = Buffer.from(params.signature.trim().toLowerCase(), "utf8");
  for (const path of candidates) {
    const expected = Buffer.from(
      signerAfriSoftHub(params.secret, params.timestamp, params.method, path, params.rawBody),
      "utf8"
    );
    if (provided.length === expected.length && crypto.timingSafeEqual(provided, expected)) {
      return true;
    }
  }
  return false;
}

/** UUID déterministe (v4-like) à partir d'une clé d'idempotence client */
export function uuidDepuisCle(cle: string): string {
  const h = crypto.createHash("sha256").update(cle).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function referenceHubPaiement(appId: string, purpose: string, uuid?: string): string {
  const app = appId.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "reserva";
  const p = purpose.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "pay";
  return `${app}_${p}_${(uuid || crypto.randomUUID()).toLowerCase()}`;
}

function credsHub(): { baseUrl: string; appId: string; apiKey: string } {
  const appId = env.AFRISOFT_HUB_APP_ID.trim().toLowerCase();
  const apiKey = env.AFRISOFT_HUB_API_KEY;
  if (!appId || !apiKey) {
    throw new Error(
      "Hub AfriSoft non configuré (AFRISOFT_HUB_APP_ID / AFRISOFT_HUB_API_KEY). Mode production impossible."
    );
  }
  return {
    baseUrl: env.AFRISOFT_PAY_HUB_URL.replace(/\/$/, ""),
    appId,
    apiKey,
  };
}

function messageErreurHub(json: Record<string, unknown>, fallback: string): string {
  const top = typeof json.message === "string" ? json.message : undefined;
  const err = json.error;
  const nested =
    typeof err === "string"
      ? err
      : err && typeof err === "object"
        ? String((err as Record<string, unknown>).message || "")
        : undefined;
  return (top || nested || fallback).trim() || fallback;
}

function mapperReponseHub(json: Record<string, unknown>, fallbackMsg: string): ResultatHubPaiement {
  const statusRaw = String(json.status || "").toUpperCase();
  const statut: StatutHubPaiement | undefined =
    statusRaw === "COMPLETED" || statusRaw === "FAILED" || statusRaw === "PENDING"
      ? statusRaw
      : undefined;
  const paymentId =
    typeof json.payment_id === "string"
      ? json.payment_id
      : typeof json.paymentId === "string"
        ? json.paymentId
        : undefined;
  const providerRef =
    typeof json.provider_ref === "string"
      ? json.provider_ref
      : typeof json.providerRef === "string"
        ? json.providerRef
        : undefined;
  const reference = typeof json.reference === "string" ? json.reference : undefined;
  const amount = json.amount_cdf ?? json.amountCdf;
  return {
    succes: statut !== "FAILED" && Boolean(paymentId || providerRef || reference),
    enAttente: statut === "PENDING" || (!statut && Boolean(paymentId || reference)),
    paymentId,
    reference,
    providerRef: paymentId ?? providerRef,
    paymentUrl:
      typeof json.payment_url === "string"
        ? json.payment_url
        : typeof json.paymentUrl === "string"
          ? json.paymentUrl
          : undefined,
    statut: statut ?? "PENDING",
    amountCdf: typeof amount === "number" ? amount : undefined,
    message: messageErreurHub(json, fallbackMsg),
  };
}

async function hubFetch(
  method: "GET" | "POST",
  path: string,
  bodyObj?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const creds = credsHub();
  const rawBody = method === "GET" || !bodyObj ? "" : JSON.stringify(bodyObj);
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = signerAfriSoftHub(creds.apiKey, ts, method, path, rawBody);

  try {
    const res = await fetch(`${creds.baseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-AfriSoft-App-Id": creds.appId,
        "X-AfriSoft-Api-Key": creds.apiKey,
        "X-AfriSoft-Timestamp": ts,
        "X-AfriSoft-Signature": signature,
      },
      ...(rawBody ? { body: rawBody } : {}),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, json };
  } catch {
    return {
      ok: false,
      status: 0,
      json: { message: "Hub paiements AfriSoft temporairement indisponible." },
    };
  }
}

export async function initierPaiementViaHubAfriSoft(params: {
  operateur: OperateurMobileMoney;
  telephone: string;
  amountCdf: number;
  reference?: string;
  purpose?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  kind?: "C2B" | "B2C";
}): Promise<ResultatHubPaiement> {
  const creds = credsHub();
  const purpose = params.purpose || (params.kind === "B2C" ? "withdraw" : "pay");
  const reference = params.reference || referenceHubPaiement(creds.appId, purpose);
  const path = params.kind === "B2C" ? "/v1/payouts" : "/v1/payments";
  const body = {
    app_id: creds.appId,
    amount_cdf: Math.round(params.amountCdf),
    currency: "CDF",
    phone: telephonePourHub(params.telephone),
    telecom: telecomDepuisOperateur(params.operateur),
    reference,
    purpose,
    ...(params.metadata ? { metadata: params.metadata } : {}),
    ...(params.idempotencyKey ? { idempotency_key: params.idempotencyKey } : {}),
  };

  const { ok, json } = await hubFetch("POST", path, body);
  if (!ok) {
    return {
      succes: false,
      message: messageErreurHub(json, "Échec de l'initiation Mobile Money via le hub AfriSoft."),
    };
  }

  const mapped = mapperReponseHub(
    json,
    params.kind === "B2C"
      ? "Remboursement Mobile Money initié."
      : "Confirmez le paiement sur votre téléphone Mobile Money."
  );
  return {
    ...mapped,
    reference: mapped.reference ?? reference,
    succes: mapped.succes,
    enAttente: mapped.statut !== "COMPLETED",
  };
}

export async function consulterPaiementHubAfriSoft(lookup: {
  paymentId?: string;
  reference?: string;
}): Promise<ResultatHubPaiement> {
  const path = lookup.paymentId
    ? `/v1/payments/${encodeURIComponent(lookup.paymentId)}`
    : lookup.reference
      ? `/v1/payments/by-reference/${encodeURIComponent(lookup.reference)}`
      : "";
  if (!path) {
    return { succes: false, message: "payment_id ou reference requis" };
  }
  const { ok, json } = await hubFetch("GET", path);
  if (!ok) {
    return { succes: false, message: messageErreurHub(json, "Paiement introuvable sur le hub.") };
  }
  return mapperReponseHub(json, "Statut hub");
}

export function secretWebhookAfriSoft(): string {
  return (env.AFRISOFT_HUB_WEBHOOK_SECRET || env.AFRISOFT_HUB_API_KEY || "").trim();
}
