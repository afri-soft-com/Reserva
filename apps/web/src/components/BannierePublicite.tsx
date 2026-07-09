"use client";

import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { listerPublicitesActives, incrementerCompteur } from "../lib/api-publicites";
import Image from "next/image";

export function BannierePublicite() {
  const [publicites, setPublicites] = useState<any[]>([]);
  const [ferme, setFerme] = useState(false);

  useEffect(() => {
    listerPublicitesActives()
      .then((liste) => {
        setPublicites(liste);
        liste.forEach((pub: any) =>
          incrementerCompteur(pub.id, "IMPRESSION").catch(() => {})
        );
      })
      .catch(() => {});
  }, []);

  if (ferme || publicites.length === 0) return null;

  const pub = publicites[0];

  return (
    <div className="relative overflow-hidden rounded-card bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
      <button
        onClick={() => setFerme(true)}
        className="absolute right-2 top-2 z-10 rounded-full bg-black/20 p-1 text-white hover:bg-black/40"
      >
        <X className="h-4 w-4" />
      </button>
      <a
        href={pub.lienUrl || "#"}
        target={pub.lienUrl ? "_blank" : undefined}
        rel="noopener noreferrer"
        onClick={() => incrementerCompteur(pub.id, "CLIC").catch(() => {})}
        className="flex items-center gap-4 p-4 text-white no-underline"
      >
        {pub.imageUrl && (
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
            <Image src={pub.imageUrl} alt={pub.titre} fill className="object-cover" unoptimized />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold">{pub.titre}</p>
          {pub.description && <p className="mt-1 text-sm text-blue-100 line-clamp-2">{pub.description}</p>}
        </div>
        <ExternalLink className="hidden h-5 w-5 shrink-0 sm:block" />
      </a>
    </div>
  );
}
