"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Users,
  CreditCard,
  Package,
  Megaphone,
  MessageCircle,
  Tags,
  BellRing,
  Landmark,
  Wallet,
  Bus,
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  Hotel,
  Scale,
  Download,
} from "lucide-react";
import { useAuthStore } from "../../lib/store-auth";
import clsx from "clsx";

const NAV_GROUPES = [
  {
    titre: "Pilotage",
    items: [
      { href: "/admin/pilotage", label: "Vue d'ensemble", icon: LayoutDashboard },
      { href: "/admin/statistiques", label: "Statistiques", icon: BarChart3 },
      { href: "/admin/reservations", label: "Réservations", icon: CalendarCheck },
    ],
  },
  {
    titre: "Économie",
    items: [
      { href: "/admin/finances", label: "Finances", icon: Landmark },
      { href: "/admin/ledger", label: "Journal comptable", icon: BookOpen },
      { href: "/admin/soldes", label: "Soldes prestataires", icon: Scale },
      { href: "/admin/versements", label: "Versements", icon: Wallet },
      { href: "/admin/tarifications", label: "Tarifications", icon: CreditCard },
      { href: "/admin/abonnements", label: "Abonnements", icon: Package },
    ],
  },
  {
    titre: "OTA & catalogue",
    items: [
      { href: "/admin/hotels", label: "Hôtels", icon: Hotel },
      { href: "/admin/transport", label: "Transport", icon: Bus },
      { href: "/admin/prestataires", label: "Prestataires", icon: Building2 },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
    ],
  },
  {
    titre: "Croissance",
    items: [
      { href: "/admin/publicites", label: "Publicités", icon: Megaphone },
      { href: "/admin/codes-promos", label: "Codes promo", icon: Tags },
      { href: "/admin/notifications", label: "Notifications", icon: BellRing },
      { href: "/admin/messages", label: "Messages", icon: MessageCircle },
      { href: "/admin/exports", label: "Exports", icon: Download },
    ],
  },
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
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
      <aside className="hidden w-60 shrink-0 md:block">
        <nav className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-5 overflow-y-auto pr-1">
          {NAV_GROUPES.map((groupe) => (
            <div key={groupe.titre}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {groupe.titre}
              </p>
              <div className="space-y-0.5">
                {groupe.items.map((item) => {
                  const actif = chemin === item.href || chemin.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        actif
                          ? "bg-primaire-50 text-primaire"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
