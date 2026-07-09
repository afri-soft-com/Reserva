"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

interface ProprietesBouton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primaire" | "secondaire" | "destructif" | "fantome";
  taille?: "sm" | "md" | "lg";
  chargement?: boolean;
  children: ReactNode;
}

export function Bouton({
  variante = "primaire",
  taille = "md",
  chargement = false,
  disabled,
  className,
  children,
  ...props
}: ProprietesBouton) {
  return (
    <button
      disabled={disabled || chargement}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-bouton font-semibold transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-primaire text-white hover:bg-primaire-600": variante === "primaire",
          "bg-transparent border-2 border-primaire text-primaire hover:bg-primaire-50": variante === "secondaire",
          "bg-alerte text-white hover:bg-red-700": variante === "destructif",
          "bg-transparent text-primaire-700 hover:bg-primaire-50": variante === "fantome",
        },
        {
          "h-9 px-3 text-sm": taille === "sm",
          "h-12 px-5 text-base": taille === "md",
          "h-14 px-7 text-lg": taille === "lg",
        },
        className
      )}
      {...props}
    >
      {chargement && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
