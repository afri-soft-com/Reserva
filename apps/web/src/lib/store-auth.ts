import { create } from "zustand";
import { Utilisateur, Prestataire } from "@reserva/shared";
import { enregistrerToken, supprimerToken, obtenirToken } from "../lib/api-client";
import { obtenirProfil } from "../lib/api-auth";

interface EtatAuth {
  utilisateur: (Utilisateur & { prestataire?: Prestataire | null }) | null;
  chargementInitial: boolean;
  estConnecte: boolean;
  connecter: (token: string, utilisateur: Utilisateur) => void;
  deconnecter: () => void;
  rafraichirProfil: () => Promise<void>;
  initialiser: () => Promise<void>;
}

export const useAuthStore = create<EtatAuth>((set, get) => ({
  utilisateur: null,
  chargementInitial: true,
  estConnecte: false,

  connecter: (token, utilisateur) => {
    enregistrerToken(token);
    set({ utilisateur, estConnecte: true });
  },

  deconnecter: () => {
    supprimerToken();
    set({ utilisateur: null, estConnecte: false });
  },

  rafraichirProfil: async () => {
    try {
      const profil = await obtenirProfil();
      set({ utilisateur: profil, estConnecte: true });
    } catch {
      get().deconnecter();
    }
  },

  initialiser: async () => {
    const token = obtenirToken();
    if (!token) {
      set({ chargementInitial: false });
      return;
    }
    try {
      const profil = await obtenirProfil();
      set({ utilisateur: profil, estConnecte: true, chargementInitial: false });
    } catch {
      supprimerToken();
      set({ utilisateur: null, estConnecte: false, chargementInitial: false });
    }
  },
}));
