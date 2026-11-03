export type BornesTemps = {
  debut: Date | null;
  fin: Date | null;
  libelle: string;
};

export type PointTemps = {
  debut: Date;
  fin: Date;
  libelle: string;
};

const JOUR = /^\d{4}-\d{2}-\d{2}$/;

/** Jour civil local. La fin de journée est 23:59:59.999, pour un filtre inclusif. */
export function parserJourCivil(iso: string | undefined, finDeJournee: boolean): Date | null {
  const brut = iso?.trim() ?? "";
  if (!JOUR.test(brut)) return null;
  const [annee, mois, jour] = brut.split("-").map((n) => Number(n));
  const date = new Date(
    annee,
    mois - 1,
    jour,
    finDeJournee ? 23 : 0,
    finDeJournee ? 59 : 0,
    finDeJournee ? 59 : 0,
    finDeJournee ? 999 : 0,
  );
  if (date.getFullYear() !== annee || date.getMonth() !== mois - 1 || date.getDate() !== jour) return null;
  return date;
}

function libellePlage(debut: Date | null, fin: Date | null): string {
  const fmt = (date: Date) => date.toLocaleDateString("fr-FR");
  if (debut && fin) return `Du ${fmt(debut)} au ${fmt(fin)}`;
  if (debut) return `À partir du ${fmt(debut)}`;
  if (fin) return `Jusqu'au ${fmt(fin)}`;
  return "Période personnalisée";
}

/**
 * Bornes d'un filtre de temps.
 * `personnalisee`, ou la présence de `debut` / `fin`, prime sur les presets.
 * La fin est inclusive (fin de journée). Les presets n'ont pas de borne haute.
 */
export function bornesTemps(input: {
  periode?: string;
  debut?: string;
  fin?: string;
  maintenant?: Date;
}): BornesTemps {
  const maintenant = input.maintenant ?? new Date();
  const periode = (input.periode ?? "").trim();
  const debutTxt = input.debut?.trim() ?? "";
  const finTxt = input.fin?.trim() ?? "";
  if (periode === "personnalisee" || debutTxt || finTxt) {
    let debut = parserJourCivil(debutTxt, false);
    let fin = parserJourCivil(finTxt, true);
    if (debut && fin && debut.getTime() > fin.getTime()) {
      debut = parserJourCivil(finTxt, false);
      fin = parserJourCivil(debutTxt, true);
    }
    return { debut, fin, libelle: libellePlage(debut, fin) };
  }

  if (periode === "semaine") {
    const debut = new Date(maintenant);
    debut.setDate(debut.getDate() - debut.getDay());
    debut.setHours(0, 0, 0, 0);
    return { debut, fin: null, libelle: "Cette semaine" };
  }
  if (periode === "trimestre") {
    const debut = new Date(maintenant);
    debut.setDate(debut.getDate() - 90);
    debut.setHours(0, 0, 0, 0);
    return { debut, fin: null, libelle: "90 derniers jours" };
  }
  if (periode === "annee") {
    return { debut: new Date(maintenant.getFullYear(), 0, 1), fin: null, libelle: "Cette année" };
  }
  if (!periode || periode === "tout") {
    return { debut: null, fin: null, libelle: "Toute la période" };
  }
  return {
    debut: new Date(maintenant.getFullYear(), maintenant.getMonth(), 1),
    fin: null,
    libelle: "Ce mois-ci",
  };
}

export function filtreCreeLe(bornes: Pick<BornesTemps, "debut" | "fin">): { gte?: Date; lte?: Date } | undefined {
  const creeLe: { gte?: Date; lte?: Date } = {};
  if (bornes.debut) creeLe.gte = bornes.debut;
  if (bornes.fin) creeLe.lte = bornes.fin;
  return creeLe.gte || creeLe.lte ? creeLe : undefined;
}

/** Aucun filtre si la période est vide ou « tout » sans dates. */
export function creerLeDepuisQuery(query?: {
  periode?: string;
  debut?: string;
  fin?: string;
}): { gte?: Date; lte?: Date } | undefined {
  if (!query) return undefined;
  const periode = query.periode?.trim() ?? "";
  const debut = query.debut?.trim() ?? "";
  const fin = query.fin?.trim() ?? "";
  if ((!periode || periode === "tout") && !debut && !fin) return undefined;
  return filtreCreeLe(bornesTemps({ periode: debut || fin ? periode || "personnalisee" : periode, debut, fin }));
}

/** Points du graphique : jours si la plage tient en 62 jours, sinon mois. */
export function pointsPeriode(
  bornes: BornesTemps,
  options: { personnalisee: boolean; mois: number; maintenant: Date },
): PointTemps[] {
  const { personnalisee, maintenant } = options;
  if (personnalisee && (bornes.debut || bornes.fin)) {
    const end = bornes.fin ?? maintenant;
    // Sans date de début (« jusqu'au … »), on remonte `mois` mois avant la fin.
    const start =
      bornes.debut ?? new Date(end.getFullYear(), end.getMonth() - (Math.min(24, Math.max(1, options.mois)) - 1), 1);
    const jours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
    if (jours <= 62) {
      const points: PointTemps[] = [];
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const dernier = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cursor <= dernier && points.length < 62) {
        const debut = new Date(cursor);
        const fin = new Date(cursor);
        fin.setDate(fin.getDate() + 1);
        points.push({
          debut,
          fin,
          libelle: debut.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      return points;
    }
    const points: PointTemps[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const dernier = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= dernier && points.length < 24) {
      const debut = new Date(cursor);
      const fin = new Date(cursor);
      fin.setMonth(fin.getMonth() + 1);
      points.push({
        debut,
        fin,
        libelle: debut.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return points;
  }

  const points: PointTemps[] = [];
  const nb = Math.min(24, Math.max(1, options.mois));
  for (let i = nb - 1; i >= 0; i--) {
    const debut = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    const fin = new Date(debut.getFullYear(), debut.getMonth() + 1, 1);
    points.push({
      debut,
      fin,
      libelle: debut.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
    });
  }
  return points;
}

export function clipFenetre(
  point: PointTemps,
  bornes: BornesTemps,
  clip: boolean,
): { gte: Date; lt: Date } | null {
  let gte = point.debut;
  let lt = point.fin;
  if (clip && bornes.debut && bornes.debut > gte) gte = bornes.debut;
  if (clip && bornes.fin) {
    const apres = new Date(bornes.fin.getTime() + 1);
    if (apres < lt) lt = apres;
  }
  if (gte.getTime() >= lt.getTime()) return null;
  return { gte, lt };
}
