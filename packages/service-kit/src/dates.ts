/** Nuits [arrivée, départ) au format YYYY-MM-DD, fuseau local. */
export function nuitsEntre(arrivee: string, depart: string): string[] {
  const debut = parserJour(arrivee);
  const fin = parserJour(depart);
  if (fin <= debut) {
    throw new Error("La date de départ doit être postérieure à la date d'arrivée");
  }
  const jours: string[] = [];
  const curseur = new Date(debut);
  while (curseur < fin) {
    jours.push(formaterJour(curseur));
    curseur.setDate(curseur.getDate() + 1);
  }
  return jours;
}

export function parserJour(valeur: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur.trim());
  if (!match) throw new Error(`Date invalide : ${valeur}`);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formaterJour(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function aujourdHui(): string {
  return formaterJour(new Date());
}
