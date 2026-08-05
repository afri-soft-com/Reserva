"use client";

import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { Champ } from "../../../components/Champ";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { envoyerBroadcastAdmin } from "../../../lib/api-admin";

const ROLES: { valeur: string; libelle: string }[] = [
  { valeur: "", libelle: "Tous les utilisateurs" },
  { valeur: "CLIENT", libelle: "Clients" },
  { valeur: "PRESTATAIRE", libelle: "Prestataires" },
  { valeur: "ADMIN", libelle: "Administrateurs" },
];

export default function PageAdminBroadcast() {
  const [titre, setTitre] = useState("");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function envoyer() {
    if (!titre.trim() || !message.trim()) {
      toastErreur("Le titre et le message sont requis.");
      return;
    }
    setEnvoi(true);
    try {
      const resultat = await envoyerBroadcastAdmin({
        titre: titre.trim(),
        message: message.trim(),
        role: role || undefined,
      });
      toastSucces(`Notification envoyée à ${resultat.envoyees} utilisateur(s).`);
      setTitre("");
      setMessage("");
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Diffuser une annonce</h1>
        <p className="text-sm text-gray-500">
          Envoie une notification SYSTÈME à tous les utilisateurs ou à un rôle ciblé.
        </p>
      </div>

      <Carte>
        <div className="mb-4 flex items-center gap-2 text-gray-700">
          <Megaphone className="h-5 w-5 text-primaire" />
          <h2 className="font-bold text-gray-900">Nouvelle annonce</h2>
        </div>

        <div className="space-y-4">
          <Champ
            placeholder="Titre de l'annonce (ex : Maintenance programmée)"
            value={titre}
            maxLength={100}
            onChange={(e) => setTitre(e.target.value)}
          />
          <div>
            <textarea
              placeholder="Message (ex : L'application sera indisponible dimanche de 02h à 04h.)"
              value={message}
              maxLength={1000}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-champ border border-gray-300 p-3 text-sm focus:border-primaire focus:outline-none"
              rows={5}
            />
            <p className="mt-1 text-right text-xs text-gray-400">{message.length}/1000</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Destinataires</p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((option) => (
                <button
                  key={option.valeur || "tous"}
                  onClick={() => setRole(option.valeur)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    role === option.valeur
                      ? "bg-primaire text-white"
                      : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-primaire"
                  }`}
                >
                  {option.libelle}
                </button>
              ))}
            </div>
          </div>

          <Bouton className="w-full sm:w-auto" chargement={envoi} onClick={envoyer}>
            <Send className="h-4 w-4" /> Envoyer la notification
          </Bouton>
        </div>
      </Carte>
    </div>
  );
}
