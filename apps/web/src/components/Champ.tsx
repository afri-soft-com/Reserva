"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface ProprietesChamp extends InputHTMLAttributes<HTMLInputElement> {
  libelle?: string;
  erreur?: string;
  aide?: string;
}

export const Champ = forwardRef<HTMLInputElement, ProprietesChamp>(
  ({ libelle, erreur, aide, className, id, ...props }, ref) => {
    const champId = id || props.name;
    return (
      <div className="w-full">
        {libelle && (
          <label htmlFor={champId} className="mb-1.5 block text-sm font-medium text-gray-700">
            {libelle}
          </label>
        )}
        <input
          ref={ref}
          id={champId}
          className={clsx(
            "h-[52px] w-full rounded-champ border bg-gray-50 px-4 text-base text-gray-900",
            "placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2",
            erreur
              ? "border-alerte focus:ring-alerte/30"
              : "border-gray-300 focus:border-primaire focus:ring-primaire/20",
            className
          )}
          {...props}
        />
        {erreur && <p className="mt-1.5 text-sm text-alerte">{erreur}</p>}
        {!erreur && aide && <p className="mt-1.5 text-sm text-gray-500">{aide}</p>}
      </div>
    );
  }
);
Champ.displayName = "Champ";
