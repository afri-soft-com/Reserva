"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import clsx from "clsx";

interface Toast {
  id: string;
  message: string;
  type: "succes" | "erreur" | "info";
}

interface EtatToast {
  toasts: Toast[];
  ajouter: (message: string, type: Toast["type"]) => void;
  retirer: (id: string) => void;
}

export const useToastStore = create<EtatToast>((set) => ({
  toasts: [],
  ajouter: (message, type) => {
    const id = Math.random().toString(36).slice(2);
    set((etat) => ({ toasts: [...etat.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((etat) => ({ toasts: etat.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  retirer: (id) => set((etat) => ({ toasts: etat.toasts.filter((t) => t.id !== id) })),
}));

export function toastSucces(message: string) {
  useToastStore.getState().ajouter(message, "succes");
}
export function toastErreur(message: string) {
  useToastStore.getState().ajouter(message, "erreur");
}
export function toastInfo(message: string) {
  useToastStore.getState().ajouter(message, "info");
}

const ICONES = { succes: CheckCircle2, erreur: XCircle, info: Info };
const STYLES = {
  succes: "bg-emerald-50 text-emerald-800 border-emerald-200",
  erreur: "bg-red-50 text-red-800 border-red-200",
  info: "bg-blue-50 text-blue-800 border-blue-200",
};

export function ConteneurToasts() {
  const { toasts, retirer } = useToastStore();

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((toast) => {
        const Icone = ICONES[toast.type];
        return (
          <div
            key={toast.id}
            className={clsx(
              "flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2",
              STYLES[toast.type]
            )}
          >
            <Icone className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{toast.message}</p>
            <button onClick={() => retirer(toast.id)} className="ml-2 opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
