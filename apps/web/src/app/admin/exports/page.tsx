"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { telechargerExportAdmin } from "../../../lib/api-admin";

const EXPORTS: Array<{
  type: "reservations" | "prestataires" | "utilisateurs";
  titre: string;
  description: string;
}> = [
  {
    type: "reservations",
    titre: "Réservations",
    description: "Export CSV des réservations (n°, client, prestataire, montants, commissions).",
  },
  {
    type: "prestataires",
    titre: "Prestataires",
    description: "Catalogue prestataires avec statut, ville, catégorie et notes.",
  },
  {
    type: "utilisateurs",
    titre: "Utilisateurs",
    description: "Comptes clients, prestataires et admins (téléphone, rôle, 2FA).",
  },
];

export default function PageAdminExports() {
  const [enCours, setEnCours] = useState<string | null>(null);

  async function exporter(type: "reservations" | "prestataires" | "utilisateurs") {
    setEnCours(type);
    try {
      await telechargerExportAdmin(type);
      toastSucces(`Export ${type} téléchargé.`);
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Download className="h-6 w-6" /> Exports
        </h1>
        <p className="text-sm text-gray-500">Téléchargements CSV pour comptabilité et opérations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {EXPORTS.map((item) => (
          <Carte key={item.type}>
            <FileSpreadsheet className="mb-2 h-8 w-8 text-primaire" />
            <h2 className="font-semibold text-gray-900">{item.titre}</h2>
            <p className="mt-1 mb-4 text-sm text-gray-500">{item.description}</p>
            <Bouton
              taille="sm"
              chargement={enCours === item.type}
              onClick={() => exporter(item.type)}
            >
              <Download className="h-4 w-4" /> Télécharger CSV
            </Bouton>
          </Carte>
        ))}
      </div>
    </div>
  );
}
