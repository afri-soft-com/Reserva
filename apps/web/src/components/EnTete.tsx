"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Search, User, LogOut, LayoutDashboard, Menu, X, Shield } from "lucide-react";
import { useAuthStore } from "../lib/store-auth";
import { Bouton } from "./Bouton";
import { SelecteurLangue } from "./SelecteurLangue";

export const EnTete = memo(function EnTete() {
  const { utilisateur, estConnecte, deconnecter } = useAuthStore();
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);

  function gererDeconnexion() {
    deconnecter();
    router.push("/");
  }

  const liensNav = (
    <>
      <Link href="/services" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-primaire" onClick={() => setMenuOuvert(false)}>
        <Search className="h-4 w-4" /> Rechercher
      </Link>
      {estConnecte && (
        <Link href="/reservations" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-primaire" onClick={() => setMenuOuvert(false)}>
          <Calendar className="h-4 w-4" /> Mes réservations
        </Link>
      )}
      {estConnecte && (
        <Link href="/profil" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-primaire" onClick={() => setMenuOuvert(false)}>
          <User className="h-4 w-4" /> Profil
        </Link>
      )}
      {utilisateur?.role === "ADMIN" && (
        <Link href="/admin/statistiques" className="flex items-center gap-1.5 text-sm font-medium text-primaire hover:text-primaire-600" onClick={() => setMenuOuvert(false)}>
          <Shield className="h-4 w-4" /> Administration
        </Link>
      )}
      {utilisateur?.role === "PRESTATAIRE" && (
        <Link href="/prestataire/tableau-de-bord" className="flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700" onClick={() => setMenuOuvert(false)}>
          <LayoutDashboard className="h-4 w-4" /> Mon espace prestataire
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-primaire">RESERVA</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {liensNav}
        </nav>

        <SelecteurLangue className="hidden md:flex" />
        <div className="flex items-center gap-3">
          {estConnecte ? (
            <>
              <span className="hidden items-center gap-1.5 text-sm font-medium text-gray-600 sm:flex">
                <User className="h-4 w-4" /> {utilisateur?.nom}
              </span>
              <Bouton variante="fantome" taille="sm" onClick={gererDeconnexion}>
                <LogOut className="h-4 w-4" /> Déconnexion
              </Bouton>
            </>
          ) : (
            <>
              <Link href="/connexion">
                <Bouton variante="secondaire" taille="sm">Connexion</Bouton>
              </Link>
              <Link href="/inscription">
                <Bouton variante="primaire" taille="sm">Inscription</Bouton>
              </Link>
            </>
          )}
          <button
            className="ml-2 flex md:hidden"
            onClick={() => setMenuOuvert(!menuOuvert)}
            aria-label="Menu"
          >
            {menuOuvert ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOuvert && (
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          {liensNav}
        </div>
      )}
    </header>
  );
});
