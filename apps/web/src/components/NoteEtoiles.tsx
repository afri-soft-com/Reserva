"use client";

import { Star } from "lucide-react";
import clsx from "clsx";

interface ProprietesNoteEtoiles {
  note: number;
  taille?: number;
  interactif?: boolean;
  onChange?: (note: number) => void;
}

export function NoteEtoiles({ note, taille = 18, interactif = false, onChange }: ProprietesNoteEtoiles) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((valeur) => (
        <button
          key={valeur}
          type="button"
          disabled={!interactif}
          onClick={() => onChange?.(valeur)}
          className={clsx(interactif && "cursor-pointer hover:scale-110 transition-transform", !interactif && "cursor-default")}
          aria-label={`${valeur} étoile${valeur > 1 ? "s" : ""}`}
        >
          <Star
            size={taille}
            className={valeur <= Math.round(note) ? "fill-accent text-accent" : "fill-gray-200 text-gray-200"}
          />
        </button>
      ))}
    </div>
  );
}
