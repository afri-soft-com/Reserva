"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Shield, X } from "lucide-react";
import { useAuthStore } from "../lib/store-auth";
import { Bouton } from "./Bouton";

export const EnTete = memo(function EnTete() {
  const { utilisateur, estConnecte, deconnecter } = useAuthStore();
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const estAdmin = utilisateur?.role === "ADMIN";

  function gererDeconnexion() {
    deconnecter();
    router.push("/connexion");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href={estAdmin ? "/admin/pilotage" : "/connexion"} className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-primaire">RESERVA</span>
          <span className="hidden rounded-full bg-primaire-50 px-2 py-0.5 text-xs font-semibold text-primaire sm:inline">
            Console admin
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {estAdmin && (
            <Link href="/admin/pilotage" className="flex items-center gap-1.5 text-sm font-medium text-primaire">
              <Shield className="h-4 w-4" /> Administration
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {estConnecte ? (
            <>
              <span className="hidden text-sm font-medium text-gray-600 sm:inline">{utilisateur?.nom}</span>
              <Bouton variante="fantome" taille="sm" onClick={gererDeconnexion}>
                <LogOut className="h-4 w-4" /> Déconnexion
              </Bouton>
            </>
          ) : (
            <Link href="/connexion">
              <Bouton variante="primaire" taille="sm">Connexion admin</Bouton>
            </Link>
          )}
          <button className="ml-2 flex md:hidden" onClick={() => setMenuOuvert(!menuOuvert)} aria-label="Menu">
            {menuOuvert ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {menuOuvert && estAdmin && (
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <Link href="/admin/pilotage" onClick={() => setMenuOuvert(false)}>Administration</Link>
        </div>
      )}
    </header>
  );
});
