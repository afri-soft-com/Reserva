import clsx from "clsx";

/** Bloc gris animé : réserve la place du contenu pendant le chargement. */
export function Squelette({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("squelette rounded-lg", className)} />;
}

/** Lignes de liste factices — remplace le texte « Chargement… » sans faire sauter la mise en page. */
export function SqueletteListe({ lignes = 5, className }: { lignes?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={clsx("space-y-3", className)}>
      <span className="sr-only">Chargement…</span>
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-card bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <Squelette className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Squelette className="h-3.5 w-2/5" />
            <Squelette className="h-3 w-3/5" />
          </div>
          <Squelette className="hidden h-8 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Tuiles de statistiques + liste, pour les tableaux de bord. */
export function SqueletteTableauDeBord() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Chargement…</span>
      <Squelette className="h-7 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-card bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <Squelette className="h-3 w-1/2" />
            <Squelette className="h-6 w-3/4" />
          </div>
        ))}
      </div>
      <Squelette className="h-64 w-full rounded-card" />
    </div>
  );
}
