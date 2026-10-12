import { prisma } from "../../config/prisma";
import { ErreurInterdit } from "../../utils/erreurs";

const PREFIX = "APP_VERSION_";

export type CanalVersion = "client" | "pro" | "web";

export type ConfigVersionCanal = {
  minSoft: string;
  minForce: string;
  storeUrlAndroid?: string;
  storeUrlIos?: string;
};

export type ConfigVersions = Record<CanalVersion, ConfigVersionCanal>;

const DEFAUTS: ConfigVersions = {
  client: {
    minSoft: "1.0.0",
    minForce: "0.9.0",
    storeUrlAndroid: "https://play.google.com/store/apps/details?id=com.reserva.client",
    storeUrlIos: "https://apps.apple.com/app/id6820885784",
  },
  pro: {
    minSoft: "1.0.0",
    minForce: "0.9.0",
    storeUrlAndroid: "https://play.google.com/store/apps/details?id=com.reserva.pro",
    storeUrlIos: "https://apps.apple.com/app/id6820887223",
  },
  web: {
    minSoft: "1.0.0",
    minForce: "0.9.0",
  },
};

function cle(canal: CanalVersion, champ: string) {
  return `${PREFIX}${canal.toUpperCase()}_${champ}`;
}

export async function lireVersions(): Promise<ConfigVersions> {
  const cles = Object.keys(DEFAUTS).flatMap((canal) => {
    const c = canal as CanalVersion;
    const champs = ["minSoft", "minForce", "storeUrlAndroid", "storeUrlIos"];
    return champs.map((ch) => cle(c, ch));
  });
  const lignes = await prisma.configurationTarification.findMany({
    where: { cle: { in: cles }, actif: true },
  });
  const map = Object.fromEntries(lignes.map((l) => [l.cle, l.valeur]));

  const out = structuredClone(DEFAUTS) as ConfigVersions;
  for (const canal of Object.keys(DEFAUTS) as CanalVersion[]) {
    const soft = map[cle(canal, "minSoft")];
    const force = map[cle(canal, "minForce")];
    const and = map[cle(canal, "storeUrlAndroid")];
    const ios = map[cle(canal, "storeUrlIos")];
    if (soft) out[canal].minSoft = soft;
    if (force) out[canal].minForce = force;
    if (and) out[canal].storeUrlAndroid = and;
    if (ios) out[canal].storeUrlIos = ios;
  }
  return out;
}

export async function ecrireVersions(
  adminId: string,
  payload: Partial<ConfigVersions>,
): Promise<ConfigVersions> {
  const admin = await prisma.utilisateur.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") throw new ErreurInterdit();

  for (const canal of Object.keys(payload) as CanalVersion[]) {
    const cfg = payload[canal];
    if (!cfg) continue;
    const entrees: { champ: string; valeur: string; description: string }[] = [
      { champ: "minSoft", valeur: cfg.minSoft, description: `Version soft ${canal}` },
      { champ: "minForce", valeur: cfg.minForce, description: `Version force ${canal}` },
    ];
    if (cfg.storeUrlAndroid !== undefined) {
      entrees.push({
        champ: "storeUrlAndroid",
        valeur: cfg.storeUrlAndroid,
        description: `Store Android ${canal}`,
      });
    }
    if (cfg.storeUrlIos !== undefined) {
      entrees.push({
        champ: "storeUrlIos",
        valeur: cfg.storeUrlIos,
        description: `Store iOS ${canal}`,
      });
    }
    for (const e of entrees) {
      if (e.valeur === undefined || e.valeur === null) continue;
      await prisma.configurationTarification.upsert({
        where: { cle: cle(canal, e.champ) },
        create: {
          cle: cle(canal, e.champ),
          valeur: String(e.valeur),
          description: e.description,
          type: "TEXTE",
          actif: true,
        },
        update: { valeur: String(e.valeur), actif: true },
      });
    }
  }
  return lireVersions();
}
