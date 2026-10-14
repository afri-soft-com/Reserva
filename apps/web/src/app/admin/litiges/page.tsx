"use client";

import { useEffect, useMemo, useState } from "react";
import { Gavel, Search, Printer } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerLitiges, trancheLitige, recalculerConfiance } from "../../../lib/api-innovations";
import { imprimerElement, tableVersHtml } from "../../../lib/impression";

export default function PageAdminLitiges() {
  const [litiges, setLitiges] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    try {
      setLitiges(await listerLitiges());
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return litiges.filter((l) => {
      if (filtreStatut && l.statut !== filtreStatut) return false;
      if (!q) return true;
      const hay = [
        l.motif,
        l.description,
        l.statut,
        l.decision,
        l.reservation?.numero,
        l.ouvertPar?.nom,
        l.ouvertPar?.telephone,
        l.reservation?.client?.nom,
        l.reservation?.client?.telephone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [litiges, recherche, filtreStatut]);

  async function trancher(litigeId: string, decision: "AVOIR_TOTAL" | "REJET") {
    try {
      await trancheLitige({ litigeId, decision, commentaire: "Décision admin RESERVA" });
      toastSucces("Litige tranché");
      await charger();
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    }
  }

  function imprimer() {
    imprimerElement(
      "Litiges / médiation",
      tableVersHtml(
        ["Motif", "Statut", "Réservation", "Ouvert par", "Décision"],
        filtres.map((l) => [
          l.motif || "—",
          l.statut || "—",
          String(l.reservation?.numero ?? l.reservationId ?? "—"),
          `${l.ouvertPar?.nom || "—"} (${l.ouvertPar?.telephone || ""})`,
          l.decision || "—",
        ])
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Gavel className="w-6 h-6" /> Médiation / litiges
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Garantie arrivée, preuves client/pro, décision avoir ou rejet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Bouton variante="fantome" taille="sm" onClick={imprimer} disabled={filtres.length === 0}>
            <Printer className="h-4 w-4" /> Imprimer
          </Bouton>
          <Bouton
            onClick={async () => {
              try {
                const r = await recalculerConfiance();
                toastSucces(`Scores mis à jour (${r?.misAJour ?? "ok"})`);
              } catch (err) {
                toastErreur(extraireMessageErreur(err));
              }
            }}
          >
            Recalculer scores confiance
          </Bouton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Motif, client, téléphone, n° résa…"
            className="h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
        >
          <option value="">Tous statuts</option>
          <option value="OUVERT">Ouvert</option>
          <option value="EN_MEDIATION">En médiation</option>
          <option value="TRANCHE">Tranché</option>
          <option value="REJETE">Rejeté</option>
        </select>
      </div>

      {chargement ? (
        <p>Chargement…</p>
      ) : filtres.length === 0 ? (
        <Carte>
          <p className="p-4 text-sm">
            {litiges.length === 0
              ? "Aucun litige. Les clients ouvrent depuis l’app (détail réservation)."
              : "Aucun litige ne correspond aux filtres."}
          </p>
        </Carte>
      ) : (
        <div className="space-y-3">
          {filtres.map((l) => (
            <Carte key={l.id}>
              <div className="p-4 space-y-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <strong>{l.motif}</strong>
                  <span className="text-xs uppercase tracking-wide">{l.statut}</span>
                </div>
                <p className="text-sm">{l.description}</p>
                <p className="text-xs text-gray-500">
                  Résa {l.reservation?.numero ?? l.reservationId} · {l.ouvertPar?.nom} ({l.ouvertPar?.telephone})
                </p>
                {l.statut === "OUVERT" || l.statut === "EN_MEDIATION" ? (
                  <div className="flex gap-2 pt-2">
                    <Bouton onClick={() => trancher(l.id, "AVOIR_TOTAL")}>Avoir total</Bouton>
                    <Bouton variante="secondaire" onClick={() => trancher(l.id, "REJET")}>
                      Rejeter
                    </Bouton>
                  </div>
                ) : (
                  <p className="text-xs">Décision : {l.decision}</p>
                )}
              </div>
            </Carte>
          ))}
        </div>
      )}
    </div>
  );
}
