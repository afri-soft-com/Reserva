"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "../lib/store-auth";
import { Bouton } from "../components/Bouton";

export default function PageAccueilConsole() {
  const router = useRouter();
  const { estConnecte, utilisateur, chargementInitial } = useAuthStore();

  useEffect(() => {
    if (chargementInitial) return;
    if (estConnecte && utilisateur?.role === "ADMIN") {
      router.replace("/admin/pilotage");
    }
  }, [chargementInitial, estConnecte, utilisateur, router]);

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-12 text-center">
      <h1 className="text-3xl font-extrabold text-primaire-700">Console RESERVA</h1>
      <p className="text-gray-600">
        Cet espace web sert uniquement à piloter la plateforme. La réservation santé, transport
        et hôtels se fait dans l&apos;application mobile Android et iOS.
      </p>
      <Link href="/connexion">
        <Bouton>Connexion administrateur</Bouton>
      </Link>
    </div>
  );
}
