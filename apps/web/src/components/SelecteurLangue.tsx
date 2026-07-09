"use client";

import { definirLangue, obtenirLangue, type LangueDispo } from "../lib/i18n";

const langues: { code: LangueDispo; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "ln", label: "LN" },
  { code: "sw", label: "SW" },
];

export function SelecteurLangue({ className = "" }: { className?: string }) {
  const langueActive = obtenirLangue();

  function changerLangue(code: LangueDispo) {
    definirLangue(code);
    window.location.reload();
  }

  return (
    <div className={`flex flex-row gap-1 ${className}`}>
      {langues.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => changerLangue(code)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            code === langueActive
              ? "bg-primaire text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
