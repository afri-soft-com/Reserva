import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { authentifier } from "../../middlewares/auth";
import { envoyerSucces } from "../../utils/reponse";

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../../uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/i;
    const extOk = allowed.test(path.extname(file.originalname));
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) cb(null, true);
    else cb(new Error("Seules les images (jpg, png, gif, webp) sont autorisées"));
  },
});

export const routesUpload = Router();

routesUpload.post("/", authentifier, upload.single("fichier"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ succes: false, erreur: { message: "Aucun fichier fourni" } });
    return;
  }
  const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  envoyerSucces(res, { url, filename: req.file.filename });
});
