"use client";

import { useEffect, useState } from "react";
import { Gavel } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerLitiges, trancheLitige, recalculerConfiance } from "../../../lib/api-innovations";

export default function PageAdminLitiges() {
  const [litiges, setLitiges] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);

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

  async function trancher(litigeId: string, decision: "AVOIR_TOTAL" | "REJET") {
    try {
      await trancheLitige({ litigeId, decision, commentaire: "Décision admin RESERVA" });
      toastSucces("Litige tranché");
      await charger();
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    }
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

      {chargement ? (
        <p>Chargement…</p>
      ) : litiges.length === 0 ? (
        <Carte>
          <p className="p-4 text-sm">Aucun litige. Les clients ouvrent depuis l’app (détail réservation).</p>
        </Carte>
      ) : (
        <div className="space-y-3">
          {litiges.map((l) => (
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
