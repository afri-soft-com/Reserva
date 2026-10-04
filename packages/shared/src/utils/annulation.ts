export interface ParamsPolitiqueAnnulation {
  remboursable: boolean;
  delaiAnnulHeures: number;
  arrivee: string; // YYYY-MM-DD
  montantTotal: number;
  devise: string;
  maintenant?: Date;
}

export interface PolitiqueAnnulationCalculee {
  remboursable: boolean;
  deadline: string | null;
  heuresRestantes: number;
  frais: number;
  montantRembourse: number;
  message: string;
}

/** Calcule deadline / frais d'annulation avant paiement ou pour affichage OTA. */
export function calculerPolitiqueAnnulation(p: ParamsPolitiqueAnnulation): PolitiqueAnnulationCalculee {
  if (!p.remboursable) {
    return {
      remboursable: false,
      deadline: null,
      heuresRestantes: 0,
      frais: p.montantTotal,
      montantRembourse: 0,
      message: "Tarif non remboursable. Aucun remboursement en cas d'annulation.",
    };
  }

  const [y, m, d] = p.arrivee.split("-").map(Number);
  const arriveeDate = new Date(y, m - 1, d, 14, 0, 0, 0);
  const deadlineMs = arriveeDate.getTime() - p.delaiAnnulHeures * 60 * 60 * 1000;
  const deadline = new Date(deadlineMs);
  const maintenant = p.maintenant ?? new Date();
  const heuresRestantes = Math.max(0, (deadlineMs - maintenant.getTime()) / (60 * 60 * 1000));

  if (maintenant.getTime() <= deadlineMs) {
    return {
      remboursable: true,
      deadline: deadline.toISOString(),
      heuresRestantes: Math.round(heuresRestantes * 10) / 10,
      frais: 0,
      montantRembourse: p.montantTotal,
      message: `Annulation gratuite jusqu'au ${deadline.toLocaleString("fr-FR")} (${p.delaiAnnulHeures}h avant l'arrivée).`,
    };
  }

  const frais = Math.round(p.montantTotal * 0.5 * (p.devise === "USD" ? 100 : 1)) / (p.devise === "USD" ? 100 : 1);
  return {
    remboursable: true,
    deadline: deadline.toISOString(),
    heuresRestantes: 0,
    frais,
    montantRembourse: Math.max(0, p.montantTotal - frais),
    message: `Délai dépassé : frais d'annulation d'environ 50 % (${frais} ${p.devise}).`,
  };
}
