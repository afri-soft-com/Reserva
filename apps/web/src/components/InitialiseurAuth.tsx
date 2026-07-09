"use client";

import { useEffect } from "react";
import { useAuthStore } from "../lib/store-auth";

/** Initialise la session utilisateur au chargement de l'application (vérifie le token stocké) */
export function InitialiseurAuth({ children }: { children: React.ReactNode }) {
  const initialiser = useAuthStore((etat) => etat.initialiser);

  useEffect(() => {
    initialiser();
  }, [initialiser]);

  return <>{children}</>;
}
