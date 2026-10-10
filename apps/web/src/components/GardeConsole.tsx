"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../lib/store-auth";

const ROUTES_PUBLIQUES = ["/connexion", "/cgu", "/confidentialite", "/suppression-compte", "/reinitialiser-pin"];

export function GardeConsole({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { utilisateur, estConnecte, chargementInitial, deconnecter } = useAuthStore();

  const publique = ROUTES_PUBLIQUES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  const estAdmin = utilisateur?.role === "ADMIN";

  useEffect(() => {
    if (chargementInitial) return;

    if (estConnecte && !estAdmin) {
      deconnecter();
      if (!publique) router.replace("/connexion");
      return;
    }

    if (publique) return;

    if (!estConnecte) {
      router.replace("/connexion");
      return;
    }

    if (pathname === "/" || !pathname.startsWith("/admin")) {
      router.replace("/admin/pilotage");
    }
  }, [chargementInitial, estConnecte, estAdmin, pathname, publique, router, deconnecter]);

  if (chargementInitial) {
    return <p className="py-16 text-center text-gray-500">Chargement de la console…</p>;
  }

  if (!publique && !estConnecte) {
    return <p className="py-16 text-center text-gray-500">Redirection vers la connexion…</p>;
  }

  if (!publique && estConnecte && !estAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-card bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <h1 className="text-xl font-bold text-gray-900">Console réservée aux administrateurs</h1>
        <p className="mt-3 text-sm text-gray-600">
          Clients et prestataires réservent depuis l&apos;application mobile RESERVA (Android et iOS).
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
