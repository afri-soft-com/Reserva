import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { routesApi } from "./routes";
import { gestionnaireErreurs } from "./middlewares/erreurs";

export const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "blob:", "cdn.jsdelivr.net"],
        connectSrc: ["'self'", env.WEB_URL],
        fontSrc: ["'self'", "cdn.jsdelivr.net", "fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: [env.WEB_URL, "http://localhost:19006", "exp://localhost:19000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

const limiteurGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { succes: false, erreur: { code: "TROP_DE_REQUETES", message: "Trop de requêtes. Veuillez réessayer plus tard." } },
});
app.use(limiteurGlobal);

const limiteurAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { succes: false, erreur: { code: "TROP_DE_TENTATIVES", message: "Trop de tentatives. Veuillez réessayer plus tard." } },
});
app.use("/api/auth", limiteurAuth);

app.get("/api/sante", (_req: Request, res: Response) => {
  res.json({ statut: "operationnel", horodatage: new Date().toISOString() });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api", routesApi);

app.use((req: Request, res: Response) => {
  res.status(404).json({ succes: false, erreur: { code: "ROUTE_NON_TROUVEE", message: `Route non trouvée : ${req.method} ${req.path}` } });
});

app.use(gestionnaireErreurs);
