"use client";

export type ValeurTemps = {
  periode: string;
  debut: string;
  fin: string;
};

type Preset = { value: string; label: string };

const PRESETS: Record<"stats" | "finances" | "liste", Preset[]> = {
  stats: [
    { value: "mois", label: "Ce mois-ci" },
    { value: "semaine", label: "Cette semaine" },
    { value: "trimestre", label: "90 derniers jours" },
    { value: "annee", label: "Cette année" },
    { value: "tout", label: "Toute la période" },
    { value: "personnalisee", label: "Personnalisée" },
  ],
  finances: [
    { value: "semaine", label: "Cette semaine" },
    { value: "mois", label: "Ce mois" },
    { value: "annee", label: "Cette année" },
    { value: "tout", label: "Toute la période" },
    { value: "personnalisee", label: "Personnalisée" },
  ],
  liste: [
    { value: "tout", label: "Toute la période" },
    { value: "semaine", label: "Cette semaine" },
    { value: "mois", label: "Ce mois" },
    { value: "trimestre", label: "90 derniers jours" },
    { value: "annee", label: "Cette année" },
    { value: "personnalisee", label: "Personnalisée" },
  ],
};

export function paramsTemps(valeur: ValeurTemps): { periode?: string; debut?: string; fin?: string } {
  if (valeur.periode === "personnalisee") {
    return {
      periode: "personnalisee",
      debut: valeur.debut || undefined,
      fin: valeur.fin || undefined,
    };
  }
  return { periode: valeur.periode || undefined };
}

export function FiltreTemps({
  valeur,
  onChange,
  variante = "stats",
  label = "Période",
}: {
  valeur: ValeurTemps;
  onChange: (valeur: ValeurTemps) => void;
  variante?: "stats" | "finances" | "liste";
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">{label}</span>
        <select
          className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900"
          value={valeur.periode}
          onChange={(e) => onChange({ ...valeur, periode: e.target.value })}
        >
          {PRESETS[variante].map((preset) => (
            <option key={preset.value} value={preset.value}>{preset.label}</option>
          ))}
        </select>
      </label>
      {valeur.periode === "personnalisee" && (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Du</span>
            <input
              type="date"
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900"
              value={valeur.debut}
              max={valeur.fin || undefined}
              onChange={(e) => onChange({ ...valeur, debut: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Au</span>
            <input
              type="date"
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900"
              value={valeur.fin}
              min={valeur.debut || undefined}
              onChange={(e) => onChange({ ...valeur, fin: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  );
}
