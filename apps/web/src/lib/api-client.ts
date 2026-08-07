import axios, { AxiosInstance } from "axios";
import { ReponseApi } from "@reserva/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
export const API_HOST = API_URL.replace(/\/api\/?$/, "");

/** Clé localStorage utilisée pour stocker le token JWT côté navigateur */
const CLE_TOKEN = "reserva_token";

function creerClientAxios(): AxiosInstance {
  const client = axios.create({ baseURL: API_URL, timeout: 15000 });

  client.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(CLE_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  return client;
}

export const clientApi = creerClientAxios();

export function enregistrerToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(CLE_TOKEN, token);
  }
}

export function supprimerToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CLE_TOKEN);
  }
}

export function obtenirToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CLE_TOKEN);
}

/** Extrait un message d'erreur lisible depuis une erreur Axios ou générique */
export function extraireMessageErreur(erreur: unknown): string {
  if (axios.isAxiosError(erreur)) {
    const donnees = erreur.response?.data as ReponseApi<unknown> | undefined;
    if (donnees?.erreur?.message) {
      return donnees.erreur.message;
    }
    if (erreur.code === "ECONNABORTED") {
      return "Le serveur ne répond pas. Vérifiez votre connexion internet.";
    }
    if (!erreur.response) {
      return "Impossible de contacter le serveur RESERVA. Vérifiez que l'API est démarrée.";
    }
  }
  return "Une erreur inattendue est survenue. Veuillez réessayer.";
}
