import { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { StatutReservation, StatutPaiement } from "@reserva/shared";

interface ProprietesCarte extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Carte({ children, className, ...props }: ProprietesCarte) {
  return (
    <div
      className={clsx("rounded-card bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

const STYLES_STATUT_RESERVATION: Record<StatutReservation, string> = {
  EN_ATTENTE: "bg-amber-100 text-amber-700",
  CONFIRMEE: "bg-emerald-100 text-emerald-700",
  REFUSEE: "bg-red-100 text-red-700",
  ANNULEE: "bg-gray-100 text-gray-600",
  TERMINEE: "bg-blue-100 text-blue-700",
  ABSENCE: "bg-red-100 text-red-700",
  EN_COURS: "bg-purple-100 text-purple-700",
};

const LIBELLES_STATUT_RESERVATION: Record<StatutReservation, string> = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmée",
  REFUSEE: "Refusée",
  ANNULEE: "Annulée",
  TERMINEE: "Terminée",
  ABSENCE: "Absence",
  EN_COURS: "En cours",
};

export function BadgeStatutReservation({ statut }: { statut: StatutReservation }) {
  return (
    <span className={clsx("inline-block rounded-full px-3 py-1 text-xs font-semibold", STYLES_STATUT_RESERVATION[statut])}>
      {LIBELLES_STATUT_RESERVATION[statut]}
    </span>
  );
}

const STYLES_STATUT_PAIEMENT: Record<StatutPaiement, string> = {
  EN_ATTENTE: "bg-amber-100 text-amber-700",
  PARTIEL: "bg-orange-100 text-orange-700",
  PAYE: "bg-emerald-100 text-emerald-700",
  REMBOURSE: "bg-blue-100 text-blue-700",
  ECHOUE: "bg-red-100 text-red-700",
};

const LIBELLES_STATUT_PAIEMENT: Record<StatutPaiement, string> = {
  EN_ATTENTE: "Paiement en attente",
  PARTIEL: "Acompte versé",
  PAYE: "Payé",
  REMBOURSE: "Remboursé",
  ECHOUE: "Paiement échoué",
};

export function BadgeStatutPaiement({ statut }: { statut: StatutPaiement }) {
  return (
    <span className={clsx("inline-block rounded-full px-3 py-1 text-xs font-semibold", STYLES_STATUT_PAIEMENT[statut])}>
      {LIBELLES_STATUT_PAIEMENT[statut]}
    </span>
  );
}
