"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, Users, CreditCard, Package, Megaphone, MessageCircle, Tags, BellRing } from "lucide-react";
import { useAuthStore } from "../../lib/store-auth";
import clsx from "clsx";

const NAV_ADMIN = [
  { href: "/admin/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/admin/prestataires", label: "Prestataires", icon: Building2 },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/abonnements", label: "Abonnements", icon: Package },
  { href: "/admin/messages", label: "Messages", icon: MessageCircle },
  { href: "/admin/publicites", label: "Publicités", icon: Megaphone },
  { href: "/admin/notifications", label: "Notifications", icon: BellRing },
  { href: "/admin/codes-promos", label: "Codes Promo", icon: Tags },
  { href: "/admin/tarifications", label: "Tarifications", icon: CreditCard },
];

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  const { utilisateur } = useAuthStore();
  const chemin = usePathname();

  if (utilisateur?.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center text-gray-500">
        Accès non autorisé. Vous devez être administrateur.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
      <aside className="hidden w-56 shrink-0 md:block">
        <nav className="sticky top-24 space-y-1">
          {NAV_ADMIN.map((item) => {
            const actif = chemin === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  actif
                    ? "bg-primaire-50 text-primaire"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
