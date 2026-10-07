import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "./config/env";

const app = express();
const PROXY_TIMEOUT_MS = 25_000;

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: [env.WEB_URL, "http://localhost:3001", "http://127.0.0.1:3001"], credentials: true }));

async function ping(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return res.ok ? "operationnel" : "degrade";
  } catch {
    return "indisponible";
  }
}

app.get("/api/sante", async (_req, res) => {
  const [core, hotels, booking, transport] = await Promise.all([
    ping(`${env.CORE_URL}/api/sante`),
    ping(`${env.HOTELS_URL}/api/sante`),
    ping(`${env.BOOKING_URL}/api/sante`),
    ping(`${env.TRANSPORT_URL}/api/sante`),
  ]);
  const ok = [core, hotels, booking, transport].every((s) => s === "operationnel");
  res.status(ok ? 200 : 503).json({
    statut: ok ? "operationnel" : "degrade",
    service: "gateway",
    dependances: { core, hotels, booking, transport },
    horodatage: new Date().toISOString(),
  });
});

function proxyVers(target: string, pathFilter?: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true,
    pathFilter,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    on: {
      error(err, _req, res) {
        console.error("[gateway-proxy]", target, err.message);
        if (res && "writeHead" in res && typeof res.writeHead === "function" && !res.headersSent) {
          res.writeHead(504, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            succes: false,
            erreur: { code: "GATEWAY_TIMEOUT", message: "Service upstream indisponible ou trop lent" },
          }));
        }
      },
    },
  });
}

app.use(proxyVers(env.HOTELS_URL, "/api/hotels"));
app.use(proxyVers(env.BOOKING_URL, "/api/checkout"));
app.use(proxyVers(env.TRANSPORT_URL, "/api/transport"));
app.use(proxyVers(env.CORE_URL));

app.listen(env.PORT, () => {
  console.log(`✓ Gateway RESERVA sur http://localhost:${env.PORT}`);
  console.log(`  core      → ${env.CORE_URL}`);
  console.log(`  hotels    → ${env.HOTELS_URL}`);
  console.log(`  booking   → ${env.BOOKING_URL}`);
  console.log(`  transport → ${env.TRANSPORT_URL}`);
});
