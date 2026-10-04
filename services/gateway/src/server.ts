import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "./config/env";

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: [env.WEB_URL, "http://localhost:3001", "http://localhost:19006"], credentials: true }));

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

const commun = { changeOrigin: true, ws: true };

app.use(createProxyMiddleware({ ...commun, target: env.HOTELS_URL, pathFilter: "/api/hotels" }));
app.use(createProxyMiddleware({ ...commun, target: env.BOOKING_URL, pathFilter: "/api/checkout" }));
app.use(createProxyMiddleware({ ...commun, target: env.TRANSPORT_URL, pathFilter: "/api/transport" }));
app.use(createProxyMiddleware({ ...commun, target: env.CORE_URL }));

app.listen(env.PORT, () => {
  console.log(`✓ Gateway RESERVA sur http://localhost:${env.PORT}`);
  console.log(`  core      → ${env.CORE_URL}`);
  console.log(`  hotels    → ${env.HOTELS_URL}`);
  console.log(`  booking   → ${env.BOOKING_URL}`);
  console.log(`  transport → ${env.TRANSPORT_URL}`);
});
