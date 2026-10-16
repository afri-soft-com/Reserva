import { comparerVersions } from "@reserva/shared";
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

/** Seuils par défaut : minSoft = dernière version store connue (pousse les builds plus anciens). */
const DEFAUTS: ConfigVersions = {
  client: {
    minSoft: "1.0.1",
    minForce: "1.0.0",
    storeUrlAndroid: "https://play.google.com/store/apps/details?id=com.reserva.client",
    storeUrlIos: "https://apps.apple.com/app/id6820885784",
  },
  pro: {
    minSoft: "1.0.1",
    minForce: "1.0.0",
    storeUrlAndroid: "https://play.google.com/store/apps/details?id=com.reserva.pro",
    storeUrlIos: "https://apps.apple.com/app/id6820887223",
  },
  web: {
    minSoft: "1.0.1",
    minForce: "1.0.0",
  },
};

/** Insère les clés APP_VERSION_* absentes (n'écrase jamais une valeur admin). */
export async function assurerClesVersionsApp() {
  const entrees: { cle: string; valeur: string; description: string }[] = [];
  for (const canal of Object.keys(DEFAUTS) as CanalVersion[]) {
    const cfg = DEFAUTS[canal];
    entrees.push(
      { cle: cle(canal, "minSoft"), valeur: cfg.minSoft, description: `Version soft ${canal}` },
      { cle: cle(canal, "minForce"), valeur: cfg.minForce, description: `Version force ${canal}` },
    );
    if (cfg.storeUrlAndroid) {
      entrees.push({
        cle: cle(canal, "storeUrlAndroid"),
        valeur: cfg.storeUrlAndroid,
        description: `Store Android ${canal}`,
      });
    }
    if (cfg.storeUrlIos) {
      entrees.push({
        cle: cle(canal, "storeUrlIos"),
        valeur: cfg.storeUrlIos,
        description: `Store iOS ${canal}`,
      });
    }
  }
  let creees = 0;
  for (const e of entrees) {
    const exist = await prisma.configurationTarification.findFirst({ where: { cle: e.cle } });
    if (!exist) {
      await prisma.configurationTarification.create({
        data: { cle: e.cle, valeur: e.valeur, description: e.description, type: "TEXTE", actif: true },
      });
      creees += 1;
    }
  }
  return { creees, total: entrees.length };
}

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

async function upsertChamp(canal: CanalVersion, champ: string, valeur: string, description: string) {
  await prisma.configurationTarification.upsert({
    where: { cle: cle(canal, champ) },
    create: {
      cle: cle(canal, champ),
      valeur: String(valeur),
      description,
      type: "TEXTE",
      actif: true,
    },
    update: { valeur: String(valeur), actif: true },
  });
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
    await upsertChamp(canal, "minSoft", cfg.minSoft, `Version soft ${canal}`);
    await upsertChamp(canal, "minForce", cfg.minForce, `Version force ${canal}`);
    if (cfg.storeUrlAndroid !== undefined) {
      await upsertChamp(canal, "storeUrlAndroid", cfg.storeUrlAndroid, `Store Android ${canal}`);
    }
    if (cfg.storeUrlIos !== undefined) {
      await upsertChamp(canal, "storeUrlIos", cfg.storeUrlIos, `Store iOS ${canal}`);
    }
  }
  return lireVersions();
}

export type SeuilsPublies = Partial<
  Record<CanalVersion, { minSoft: string; minForce?: string }>
>;

/**
 * Monte les seuils de façon monotone (jamais de baisse).
 * Utilisé par la CI après déploiement web / stores pour activer les bannières
 * chez les clients encore sur une ancienne version — sans action admin manuelle.
 */
export async function publierSeuilsMonotones(payload: SeuilsPublies): Promise<{
  avant: ConfigVersions;
  apres: ConfigVersions;
  modifications: string[];
}> {
  const avant = await lireVersions();
  const modifications: string[] = [];

  for (const canal of Object.keys(payload) as CanalVersion[]) {
    const demande = payload[canal];
    if (!demande?.minSoft) continue;
    const actuel = avant[canal];
    let soft = actuel.minSoft;
    let force = actuel.minForce;

    if (comparerVersions(demande.minSoft, soft) > 0) {
      // L'ancien soft devient le plancher force (si force n'est pas déjà plus haut).
      if (comparerVersions(soft, force) > 0) {
        force = soft;
      }
      soft = demande.minSoft;
      modifications.push(`${canal}.minSoft ${actuel.minSoft} → ${soft}`);
    }
    if (demande.minForce && comparerVersions(demande.minForce, force) > 0) {
      force = demande.minForce;
      modifications.push(`${canal}.minForce ${actuel.minForce} → ${force}`);
    }

    if (soft !== actuel.minSoft || force !== actuel.minForce) {
      await upsertChamp(canal, "minSoft", soft, `Version soft ${canal}`);
      await upsertChamp(canal, "minForce", force, `Version force ${canal}`);
    }
  }

  const apres = await lireVersions();
  return { avant, apres, modifications };
}
