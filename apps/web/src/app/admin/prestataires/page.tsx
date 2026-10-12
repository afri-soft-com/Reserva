"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { Carte } from "../../../components/Carte";
import { Bouton } from "../../../components/Bouton";
import { toastErreur, toastSucces } from "../../../components/Toast";
import { extraireMessageErreur } from "../../../lib/api-client";
import { listerTousPrestatairesAdmin } from "../../../lib/api-paiements";
import {
  obtenirKycAdmin,
  reviserKycAdmin,
  validerPrestataireAdmin,
} from "../../../lib/api-admin";
import { useAuthStore } from "../../../lib/store-auth";
import { LIBELLES_CATEGORIE, LIBELLES_STATUT_KYC } from "@reserva/shared";

const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE_VALIDATION: "En attente",
  APPROUVE: "Approuvé",
  REJETE: "Rejeté",
  SUSPENDU: "Suspendu",
};

const STATUT_COULEUR: Record<string, string> = {
  EN_ATTENTE_VALIDATION: "text-amber-600 bg-amber-50",
  APPROUVE: "text-emerald-600 bg-emerald-50",
  REJETE: "text-red-600 bg-red-50",
  SUSPENDU: "text-gray-600 bg-gray-100",
};

const KYC_COULEUR: Record<string, string> = {
  BROUILLON: "text-gray-600 bg-gray-100",
  EN_REVUE: "text-amber-700 bg-amber-50",
  INFO_MANQUANTE: "text-orange-700 bg-orange-50",
  VALIDE: "text-emerald-700 bg-emerald-50",
  REFUSE: "text-red-700 bg-red-50",
};

function CarteDocument({
  url,
  label,
  pour,
  motif,
  peutReviser,
  onApprouver,
  onRejeter,
  enCours,
}: {
  url?: string | null;
  label: string;
  pour?: string;
  motif?: string | null;
  peutReviser: boolean;
  onApprouver: () => void;
  onRejeter: () => void;
  enCours: boolean;
}) {
  const present = !!url;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{label}</p>
          {pour && <p className="text-xs text-gray-500">Pour {pour}</p>}
          {motif && <p className="mt-1 text-sm font-medium text-red-600">Motif : {motif}</p>}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            present ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {present ? "Fourni" : "Absent"}
        </span>
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primaire hover:underline">
          Voir le justificatif <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p className="mt-2 text-sm text-gray-400">Aucun fichier</p>
      )}
      {peutReviser && present && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={enCours}
            onClick={onApprouver}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Approuver
          </button>
          <button
            type="button"
            disabled={enCours}
            onClick={onRejeter}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            Rejeter
          </button>
        </div>
      )}
    </div>
  );
}

export default function PageAdminPrestataires() {
  const { utilisateur } = useAuthStore();
  const [prestataires, setPrestataires] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [prestataireDetail, setPrestataireDetail] = useState<any | null>(null);
  const [dossierKyc, setDossierKyc] = useState<any | null>(null);
  const [motifRejet, setMotifRejet] = useState("");
  const [validationEnCours, setValidationEnCours] = useState(false);
  const [activation, setActivation] = useState<{
    codeActivation: string;
    canal: string;
    destinataire: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function charger() {
    setChargement(true);
    try {
      const resultat = await listerTousPrestatairesAdmin(page);
      setPrestataires(resultat.items);
      setTotalPages(resultat.totalPages);
    } catch (erreur) {
      toastErreur(extraireMessageErreur(erreur));
    } finally {
      setChargement(false);
    }
  }

  async function ouvrirDetail(p: any) {
    setPrestataireDetail(p);
    setMotifRejet("");
    setDossierKyc(null);
    try {
      const kyc = await obtenirKycAdmin(p.id);
      setDossierKyc(kyc);
    } catch {
      setDossierKyc(null);
    }
  }

  function afficherActivation(data: any) {
    const act = data?.activation;
    if (act?.codeActivation) {
      setActivation(act);
      toastSucces(act.message || "Code d'activation envoyé.");
    }
  }

  async function handleValider(prestataireId: string, approuver: boolean) {
    if (!approuver && !motifRejet.trim()) {
      toastErreur("Indiquez un motif de rejet.");
      return;
    }
    setValidationEnCours(true);
    try {
      const data = await validerPrestataireAdmin({
        prestataireId,
        approuver,
        motifRejet: approuver ? undefined : motifRejet || undefined,
      });
      if (approuver) {
        afficherActivation(data);
        toastSucces("Prestataire approuvé — code d'activation envoyé.");
      } else {
        toastSucces("Prestataire rejeté.");
        setPrestataireDetail(null);
      }
      setMotifRejet("");
      charger();
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    } finally {
      setValidationEnCours(false);
    }
  }

  async function handleReviserKyc(decision: "VALIDER" | "INFO_MANQUANTE" | "REFUSER", motifForce?: string) {
    if (!prestataireDetail) return;
    const motif = (motifForce ?? motifRejet).trim();
    if (decision !== "VALIDER" && !motif) {
      toastErreur("Indiquez un motif pour cette décision.");
      return;
    }
    setValidationEnCours(true);
    try {
      const data = await reviserKycAdmin({
        prestataireId: prestataireDetail.id,
        decision,
        motif: motif || undefined,
        approuverProfil: true,
      });
      if (decision === "VALIDER") {
        afficherActivation(data);
        toastSucces("KYC validé — profil approuvé. Code d'activation envoyé.");
      } else {
        toastSucces(
          decision === "INFO_MANQUANTE" ? "Demande d'informations envoyée." : "KYC / document refusé."
        );
        setPrestataireDetail(null);
      }
      setMotifRejet("");
      charger();
    } catch (err) {
      toastErreur(extraireMessageErreur(err));
    } finally {
      setValidationEnCours(false);
    }
  }

  async function rejeterDocument(label: string) {
    const motif = motifRejet.trim() || `Document invalide : ${label}`;
    setMotifRejet(motif);
    await handleReviserKyc("INFO_MANQUANTE", motif);
  }

  if (utilisateur?.role !== "ADMIN") {
    return (
      <Carte>
        <p className="text-center text-gray-500">Accès non autorisé.</p>
      </Carte>
    );
  }

  const kyc = dossierKyc || prestataireDetail;
  const kycStatut = kyc?.kycStatut as string | undefined;
  const peutReviserKyc = kycStatut === "EN_REVUE" || kycStatut === "INFO_MANQUANTE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des prestataires</h1>
        <p className="mt-1 text-sm text-gray-500">
          Revue KYC (identité + entreprise) puis activation du profil.
        </p>
      </div>

      {chargement && <p className="text-gray-500">Chargement...</p>}

      {!chargement && prestataires.length === 0 && (
        <Carte className="text-center text-gray-500">Aucun prestataire trouvé.</Carte>
      )}

      {!chargement && prestataires.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <table className="w-full bg-white text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Nom entreprise</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Ville</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">KYC</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prestataires.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.nomEntreprise}</td>
                    <td className="px-4 py-3 text-gray-600">{LIBELLES_CATEGORIE[p.categorie as keyof typeof LIBELLES_CATEGORIE] || p.categorie}</td>
                    <td className="px-4 py-3 text-gray-600">{p.ville}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUT_COULEUR[p.statut] || "bg-gray-100 text-gray-600"}`}>
                        {STATUT_LABEL[p.statut] || p.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${KYC_COULEUR[p.kycStatut] || "bg-gray-100 text-gray-600"}`}>
                        {LIBELLES_STATUT_KYC[p.kycStatut as keyof typeof LIBELLES_STATUT_KYC] || p.kycStatut || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.noteMoyenne?.toFixed(1) || "—"}</td>
                    <td className="px-4 py-3">
                      <Bouton variante="fantome" taille="sm" onClick={() => ouvrirDetail(p)}>
                        <Building2 className="h-4 w-4" /> Détails
                      </Bouton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Bouton variante="fantome" taille="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Bouton>
            <span className="text-sm text-gray-500">
              Page {page} sur {totalPages}
            </span>
            <Bouton variante="fantome" taille="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Suivant <ChevronRight className="h-4 w-4" />
            </Bouton>
          </div>
        </>
      )}

      {prestataireDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => { setPrestataireDetail(null); setMotifRejet(""); }}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{prestataireDetail.nomEntreprise}</h2>
              <button onClick={() => { setPrestataireDetail(null); setMotifRejet(""); }}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <p><span className="font-semibold">Catégorie :</span> {LIBELLES_CATEGORIE[prestataireDetail.categorie as keyof typeof LIBELLES_CATEGORIE] || prestataireDetail.categorie}</p>
              <p><span className="font-semibold">Ville :</span> {prestataireDetail.ville} — {prestataireDetail.quartier}</p>
              <p><span className="font-semibold">Contact :</span> {prestataireDetail.utilisateur?.telephone || "—"} • {prestataireDetail.utilisateur?.nom || "—"}</p>
              <p>
                <span className="font-semibold">Statut profil :</span>{" "}
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUT_COULEUR[prestataireDetail.statut] || "bg-gray-100 text-gray-600"}`}>
                  {STATUT_LABEL[prestataireDetail.statut] || prestataireDetail.statut}
                </span>
              </p>
              <p>
                <span className="font-semibold">Statut KYC :</span>{" "}
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${KYC_COULEUR[kycStatut || ""] || "bg-gray-100 text-gray-600"}`}>
                  {LIBELLES_STATUT_KYC[kycStatut as keyof typeof LIBELLES_STATUT_KYC] || kycStatut || "—"}
                </span>
              </p>
              {(kyc?.kycMotifRejet || prestataireDetail.motifRejet) && (
                <p><span className="font-semibold text-red-600">Motif :</span> {kyc?.kycMotifRejet || prestataireDetail.motifRejet}</p>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-bold text-gray-900">Dossier KYC</h3>
              <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                <p><span className="font-semibold">Pièce :</span> {kyc?.pieceIdentiteType || "—"} {kyc?.pieceIdentiteNumero || ""}</p>
                <p><span className="font-semibold">RCCM :</span> {kyc?.rccm || "—"}</p>
                <p><span className="font-semibold">NIF :</span> {kyc?.nif || "—"}</p>
                <p className="sm:col-span-2"><span className="font-semibold">Adresse légale :</span> {kyc?.adresseLegale || "—"}</p>
              </div>
              {kyc?.checklist?.manquants?.length > 0 && (
                <p className="mt-3 text-xs text-amber-700">
                  Manquant : {kyc.checklist.manquants.join(" ; ")}
                </p>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["pieceIdentiteRectoUrl", "Pièce d'identité (recto)"],
                  ["pieceIdentiteVersoUrl", "Pièce d'identité (verso)"],
                  ["selfieUrl", "Selfie (photo de profil)"],
                  ["documentRccmUrl", "Document RCCM"],
                  ["documentNifUrl", "Document NIF"],
                  ["attestationUrl", "Attestation"],
                ] as const
              ).map(([cle, label]) => (
                <CarteDocument
                  key={cle}
                  url={kyc?.[cle]}
                  label={label}
                  pour={prestataireDetail.nomEntreprise || prestataireDetail.utilisateur?.nom}
                  motif={kycStatut === "INFO_MANQUANTE" || kycStatut === "REFUSE" ? kyc?.kycMotifRejet : null}
                  peutReviser={!!peutReviserKyc}
                  enCours={validationEnCours}
                  onApprouver={() => toastSucces(`${label} noté OK — validez le dossier ci-dessous.`)}
                  onRejeter={() => rejeterDocument(label)}
                />
              ))}
            </div>

            {peutReviserKyc && (
              <div className="mt-6 space-y-3">
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Vous pouvez approuver le dossier : un code d&apos;activation sera envoyé (SMS ou e-mail Google).
                </p>
                <textarea
                  placeholder="Motif de rejet / infos manquantes (requis pour rejeter)"
                  value={motifRejet}
                  onChange={(e) => setMotifRejet(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire"
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  <Bouton variante="primaire" taille="sm" chargement={validationEnCours} onClick={() => handleReviserKyc("VALIDER")} className="flex-1">
                    Documents OK — Approuver le dossier
                  </Bouton>
                  <Bouton variante="destructif" taille="sm" chargement={validationEnCours} onClick={() => handleReviserKyc("REFUSER")} className="flex-1">
                    Rejeter le dossier
                  </Bouton>
                  <Bouton variante="secondaire" taille="sm" chargement={validationEnCours} onClick={() => handleReviserKyc("INFO_MANQUANTE")} className="w-full">
                    Demander des infos manquantes
                  </Bouton>
                </div>
              </div>
            )}

            {prestataireDetail.statut === "EN_ATTENTE_VALIDATION" && (
              <div className="mt-6 space-y-3">
                <p className="text-xs text-gray-500">
                  L&apos;approbation est possible sans documents. Exigez-les plus tard via{" "}
                  <a href="/admin/documents-kyc" className="text-primaire underline">Documents &amp; KYC</a>.
                </p>
                <textarea
                  placeholder="Motif de rejet (requis pour rejeter)"
                  value={motifRejet}
                  onChange={(e) => setMotifRejet(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primaire"
                  rows={2}
                />
                <div className="flex gap-3">
                  <Bouton variante="primaire" taille="sm" chargement={validationEnCours} onClick={() => handleValider(prestataireDetail.id, true)} className="flex-1">
                    Approuver le profil
                  </Bouton>
                  <Bouton variante="destructif" taille="sm" chargement={validationEnCours} disabled={!motifRejet.trim()} onClick={() => handleValider(prestataireDetail.id, false)} className="flex-1">
                    Rejeter
                  </Bouton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-extrabold text-gray-900">Activation du compte</h3>
              <button type="button" onClick={() => setActivation(null)} aria-label="Fermer">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600">{activation.message}</p>
            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Code d&apos;activation</p>
              <p className="mt-1 font-mono text-3xl font-extrabold tracking-widest text-emerald-900">
                {activation.codeActivation}
              </p>
              <p className="mt-2 text-xs text-emerald-800">
                Canal : {activation.canal} → {activation.destinataire}
              </p>
            </div>
            <Bouton
              variante="primaire"
              className="mt-5 w-full"
              onClick={() => {
                setActivation(null);
                setPrestataireDetail(null);
              }}
            >
              Fermer
            </Bouton>
          </div>
        </div>
      )}
    </div>
  );
}
