import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { gestionnaireErreurs } from "@reserva/service-kit";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { routesTransport } from "./modules/transport.routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: [env.WEB_URL, "http://localhost:4000"], credentials: true }));
app.use(express.json());
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

app.get("/api/sante", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ statut: "operationnel", service: "transport", horodatage: new Date().toISOString() });
  } catch {
    res.status(503).json({ statut: "indisponible", service: "transport" });
  }
});

app.use("/api/transport", routesTransport);
app.use(gestionnaireErreurs);
