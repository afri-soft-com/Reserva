"use client";

import { ReactNode, useEffect, useState } from "react";
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
  ScrollText,
  FileCheck2,
  FolderTree,
  Menu as MenuIcon,
  X,
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
      { href: "/admin/categories", label: "Catégories", icon: FolderTree },
      { href: "/admin/prestataires", label: "Prestataires", icon: Building2 },
      { href: "/admin/documents-kyc", label: "Documents & KYC", icon: FileCheck2 },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
    ],
  },
  {
    titre: "Croissance",
    items: [
      { href: "/admin/publicites", label: "Publicités", icon: Megaphone },
      { href: "/admin/agents", label: "Agents quartier", icon: Users },
      { href: "/admin/codes-promos", label: "Codes promo", icon: Tags },
      { href: "/admin/litiges", label: "Litiges / médiation", icon: Scale },
      { href: "/admin/notifications", label: "Notifications", icon: BellRing },
      { href: "/admin/messages", label: "Messages", icon: MessageCircle },
      { href: "/admin/versions", label: "Versions apps", icon: Download },
      { href: "/admin/confidentialite", label: "Confidentialité", icon: ScrollText, superAdminOnly: true },
      { href: "/admin/exports", label: "Exports", icon: Download },
      { href: "/admin/audits", label: "Audit", icon: ScrollText },
    ],
  },
];

const SUPERADMIN_PHONES = (process.env.NEXT_PUBLIC_SUPERADMIN_PHONES || "+243900000001")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const SUPERADMIN_EMAILS = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS || "celestinkas@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function estSuperAdminNav(u: { telephone?: string | null; email?: string | null } | null | undefined) {
  if (!u) return false;
  if (u.telephone && SUPERADMIN_PHONES.includes(u.telephone)) return true;
  const email = (u.email || "").trim().toLowerCase();
  return Boolean(email && SUPERADMIN_EMAILS.includes(email));
}

function NavAdmin({
  chemin,
  utilisateur,
  onNaviguer,
}: {
  chemin: string;
  utilisateur: Parameters<typeof estSuperAdminNav>[0];
  onNaviguer?: () => void;
}) {
  return (
    <>
      {NAV_GROUPES.map((groupe) => (
        <div key={groupe.titre}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {groupe.titre}
          </p>
          <div className="space-y-0.5">
            {groupe.items
              .filter((item) => !("superAdminOnly" in item && item.superAdminOnly) || estSuperAdminNav(utilisateur))
              .map((item) => {
                const actif = chemin === item.href || chemin.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNaviguer}
                    aria-current={actif ? "page" : undefined}
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
    </>
  );
}

function libellePage(chemin: string) {
  for (const groupe of NAV_GROUPES) {
    const item = groupe.items.find((i) => chemin === i.href || chemin.startsWith(i.href + "/"));
    if (item) return item.label;
  }
  return "Administration";
}

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  const { utilisateur } = useAuthStore();
  const chemin = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);

  // Ferme le tiroir à chaque navigation, bloque le défilement derrière et réagit à Échap.
  useEffect(() => setMenuOuvert(false), [chemin]);
  useEffect(() => {
    if (!menuOuvert) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && setMenuOuvert(false);
    window.addEventListener("keydown", surTouche);
    return () => {
      document.body.style.overflow = precedent;
      window.removeEventListener("keydown", surTouche);
    };
  }, [menuOuvert]);

  if (utilisateur?.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center text-gray-500">
        Accès non autorisé. Vous devez être administrateur.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-8">
      {/* Barre mobile : la navigation latérale est masquée sous md. */}
      <div className="sticky top-16 z-30 -mx-4 mb-4 flex items-center gap-3 border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMenuOuvert(true)}
          aria-expanded={menuOuvert}
          aria-controls="menu-admin-mobile"
          className="flex h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 active:bg-gray-100"
        >
          <MenuIcon className="h-4 w-4" />
          Menu
        </button>
        <span className="truncate text-sm font-semibold text-gray-900">{libellePage(chemin)}</span>
      </div>

      <div
        className={clsx(
          "fixed inset-0 z-50 md:hidden",
          menuOuvert ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!menuOuvert}
      >
        <div
          className={clsx(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            menuOuvert ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMenuOuvert(false)}
        />
        <nav
          id="menu-admin-mobile"
          aria-label="Navigation administration"
          className={clsx(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 ease-out",
            menuOuvert ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">Administration</span>
            <button
              type="button"
              onClick={() => setMenuOuvert(false)}
              aria-label="Fermer le menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
            <NavAdmin chemin={chemin} utilisateur={utilisateur} onNaviguer={() => setMenuOuvert(false)} />
          </div>
        </nav>
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 md:block">
          <nav aria-label="Navigation administration" className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-5 overflow-y-auto pr-1">
            <NavAdmin chemin={chemin} utilisateur={utilisateur} />
          </nav>
        </aside>
        <main key={chemin} className="min-w-0 flex-1 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
