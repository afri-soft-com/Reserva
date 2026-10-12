import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authentifier } from "../../middlewares/auth";
import { envoyerSucces } from "../../utils/reponse";
import { ErreurValidation } from "../../utils/erreurs";

const dossierUploads = path.join(__dirname, "../../../uploads");
fs.mkdirSync(dossierUploads, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(dossierUploads, { recursive: true });
    cb(null, dossierUploads);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || guessExt(file.mimetype) || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function guessExt(mime: string): string {
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("pdf")) return ".pdf";
  if (mime.includes("heic") || mime.includes("heif")) return ".heic";
  return ".jpg";
}

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExt = /jpeg|jpg|png|gif|webp|pdf|heic|heif/i;
    const allowedMime =
      /jpeg|jpg|png|gif|webp|pdf|heic|heif|image\/|application\/pdf|application\/octet-stream/i;
    const ext = path.extname(file.originalname || "");
    const extOk = !ext || allowedExt.test(ext);
    const mimeOk = allowedMime.test(file.mimetype || "image/jpeg");
    if (extOk && mimeOk) cb(null, true);
    else cb(new ErreurValidation("Formats autorisés : images (jpg, png, webp, heic) ou PDF"));
  },
});

export const routesUpload = Router();

routesUpload.post(
  "/",
  authentifier,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("fichier")(req, res, (err: unknown) => {
      if (err instanceof ErreurValidation) return next(err);
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new ErreurValidation("Fichier trop volumineux (max 12 Mo)"));
        }
        return next(new ErreurValidation(err.message));
      }
      if (err) return next(err instanceof Error ? err : new ErreurValidation(String(err)));
      next();
    });
  },
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ succes: false, erreur: { message: "Aucun fichier fourni" } });
      return;
    }
    const host = req.get("x-forwarded-host") || req.get("host");
    const proto = (req.get("x-forwarded-proto") || req.protocol || "https").split(",")[0].trim();
    const url = `${proto}://${host}/uploads/${req.file.filename}`;
    envoyerSucces(res, { url, filename: req.file.filename });
  },
);
