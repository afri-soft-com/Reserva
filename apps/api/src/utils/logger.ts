import fs from "fs";
import path from "path";

const dossierLogs = path.join(__dirname, "..", "..", "logs");
fs.mkdirSync(dossierLogs, { recursive: true });

const fichierRequetes = path.join(dossierLogs, "requests.jsonl");
const flux = fs.createWriteStream(fichierRequetes, { flags: "a" });

/**
 * Stream pour morgan : écrit une ligne JSON par requête (logs structurés).
 * Exemple : {"horodatage":"...","methode":"GET","url":"/api/services","statut":200,"dureeMs":12}
 */
export const fluxLogsJson = {
  write: (ligne: string) => {
    const debut = new Date().toISOString();
    const corps = ligne.trim();
    if (!corps) return;
    const [methode, url, statut, duree] = corps.split(" ");
    const entree = {
      horodatage: debut,
      methode,
      url: url ? decodeURIComponent(url) : "",
      statut: statut ? parseInt(statut, 10) : null,
      dureeMs: duree ? parseFloat(duree.replace("ms", "")) : null,
    };
    flux.write(`${JSON.stringify(entree)}\n`);
  },
};

export const formatLogsJson = (tokens: any, req: any, res: any) =>
  `${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)} ${tokens["response-time"](req, res)} ms`;
